# Deterministic Control Layer

**Principle:** the LLM never computes a score, never decides who's a lead, and never writes a
fact that didn't already exist in structured data. It's allowed to *phrase* — never to *decide*
or *invent*. Everything downstream of the LLM has to survive the LLM being switched off.

---

## Where the line sits

| Function | Owner | Why |
|---|---|---|
| Propensity score (equity, tenure, comp trend, engagement → 0–100) | **Deterministic code** | Same inputs must always produce the same score. Auditable, testable, reproducible. |
| Ranking/sort order | **Deterministic code** | Pure function of the score. |
| "Why this lead" explanation text | LLM, **gated** | Convenience/readability only — never the only place a fact lives. |
| Outreach draft copy | LLM, **gated + human approval required** | Never auto-sent regardless of validation passing. |
| Audit log entry | **Deterministic code** | Must exist and be correct even if the LLM call fails, times out, or is disabled. |

If the LLM is turned off entirely, the app still shows correct scores, correct ranking, and a
correct (if blunter) explanation — just via a template instead of generated prose.

---

## The three pieces that make this real (not just a policy statement)

### 1. Deterministic scoring stays pure code — no change needed
Already true in the current design (`propensity_score` is a formula over structured fields). The
only addition: version it explicitly so every score is traceable to the formula that produced it.

```js
const SCORING_MODEL_VERSION = "v1.1.0"; // v1.1: tenure component now empirically grounded

// Source: U.S. Census Bureau ACS 2024 1yr, Table B25038 (Tenure by Year Householder
// Moved Into Unit), Arizona, owner-occupied. Annualized hazard derived from decline
// in stock between consecutive tenure buckets. 0-4yr excluded from the empirical fit
// (confounded by the 2020-2022 homebuying volume spike) and left as judgment-based.
// 35+yr is extrapolated, not directly empirical. See generate_synthetic_data_az.py
// for the derivation.
const TENURE_READINESS_BUCKETS = [
  { min: 5,  max: 14,  index: 100.0, basis: "empirical" },
  { min: 15, max: 24,  index: 75.7,  basis: "empirical" },
  { min: 25, max: 34,  index: 68.8,  basis: "empirical" },
  { min: 35, max: 999, index: 58.5,  basis: "extrapolated" },
];

function tenureReadinessIndex(years) {
  if (years < 5) return Math.round((years / 5) * 30 * 10) / 10; // judgment-based floor, not empirical
  const bucket = TENURE_READINESS_BUCKETS.find(b => years >= b.min && years <= b.max);
  return bucket ? bucket.index : 58.5;
}

function computeScore(lead) {
  // pure function — same input always produces same output, no LLM call anywhere in here
  const equityComponent = Math.min(lead.estimated_equity / MAX_EQUITY, 1) * 40;
  const tenureComponent = (tenureReadinessIndex(lead.ownership_tenure_years) / 100) * 25;
  const trendComponent = Math.min(Math.max(lead.zip_zhvi_1yr_change_pct, 0) / MAX_TREND, 1) * 20;
  const engagementComponent = (lead.engagement_score_0_100 / 100) * 15;
  return {
    score: Math.round((equityComponent + tenureComponent + trendComponent + engagementComponent) * 10) / 10,
    model_version: SCORING_MODEL_VERSION,
  };
}
```

**What changed and why it matters:** the old tenure component was a straight line I made up (longer tenure = linearly higher score, capped at 15yr). The new one is a step function shaped like the real data — it *peaks* at 5–14yr tenure and *declines* afterward, because that's what Arizona ACS data actually shows: households in that window have the highest measured annual turnover rate, and turnover gets rarer the longer someone stays beyond that (rate lock-in, aging in place). A 30-year owner isn't nothing — they're just empirically less likely to be a near-term seller than a 10-year owner, even though they have more equity. The equity, trend, and engagement weights are still judgment calls, undocumented as anything more than that.

### 2. A guaranteed deterministic fallback explanation — no LLM call required to produce it

```js
function deterministicExplanation(lead) {
  // No LLM. Always available. This is the floor, not a placeholder.
  const reasons = [];
  if (lead.estimated_equity > 100000)
    reasons.push(`~$${Math.round(lead.estimated_equity / 1000)}K estimated equity`);
  if (lead.ownership_tenure_years > 7)
    reasons.push(`${lead.ownership_tenure_years} years in home`);
  if (lead.zip_zhvi_1yr_change_pct > 5)
    reasons.push(`${lead.zip_zhvi_1yr_change_pct}% ZIP appreciation, past 12mo`);
  return reasons.slice(0, 3);
}
```

### 3. LLM path is opt-in, schema-constrained, and validated against the same source data

```js
async function getExplanation(lead, env) {
  const fallback = deterministicExplanation(lead);

  if (!env.ENABLE_LLM_EXPLANATIONS) return { reasons: fallback, source: "deterministic" };

  try {
    const llmOutput = await callLLM({
      // The LLM sees ONLY the already-computed structured facts — never raw CRM data,
      // never asked to infer anything, never asked to produce a number itself.
      input: {
        equity: lead.estimated_equity,
        tenure_years: lead.ownership_tenure_years,
        zip_trend_pct: lead.zip_zhvi_1yr_change_pct,
        engagement: lead.engagement_score_0_100,
      },
      instruction: "Phrase these 4 facts as up to 3 short reasons. Do not add numbers not given. Do not speculate.",
      response_schema: { reasons: ["string", "string", "string"] }, // structured output, not free text
    });

    if (!validateAgainstSource(llmOutput.reasons, lead)) {
      // LLM said something not traceable to the source data — reject, don't render it
      return { reasons: fallback, source: "deterministic_fallback_validation_failed" };
    }
    return { reasons: llmOutput.reasons, source: "llm_v" + env.LLM_MODEL_VERSION };
  } catch (e) {
    // LLM call failed/timed out — app does not break, does not block, does not retry-loop
    return { reasons: fallback, source: "deterministic_fallback_llm_error" };
  }
}

function validateAgainstSource(reasons, lead) {
  const sourceNumbers = extractNumbers([lead.estimated_equity, lead.ownership_tenure_years,
                                         lead.zip_zhvi_1yr_change_pct, lead.engagement_score_0_100]);
  for (const line of reasons) {
    for (const n of extractNumbers([line])) {
      if (!sourceNumbers.some(sn => Math.abs(sn - n) < sn * 0.02)) return false; // number not in source → reject
    }
  }
  return true;
}
```

**What this buys you:**
- A number the LLM invents (even a plausible-sounding one) gets caught and the response is
  rejected before it ever reaches the dashboard — not "trust but verify," actually verify.
- The `source` field on every explanation is logged, so you can audit what fraction of
  explanations are LLM-generated vs. fallback vs. rejected, over time.
- `ENABLE_LLM_EXPLANATIONS` is a single config flag — the kill switch. Flipping it to `false`
  degrades the app to fully deterministic with zero code changes elsewhere.

---

## Audit logging — deterministic, runs regardless of LLM outcome

Every explanation request writes one row, independent of which path served it:

```js
async function logExplanationEvent(env, { contact_id, model_version, source, score }) {
  await env.AUDIT_DB.prepare(
    `INSERT INTO audit_log (contact_id, scoring_model_version, explanation_source, score, ts)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(contact_id, model_version, source, score, Date.now()).run();
}
```

This is the piece that makes the earlier "no charter, no run" governance language real rather
than aspirational: nothing renders to an agent without a logged, versioned trail of whether a
human-written rule or an LLM produced it, and every LLM output was checked against source data
before it was allowed to reach that trail as `llm_v...` rather than a rejected/fallback entry.

---

## Updated file list (adds one file, still flat)

```
realestateprospectingapp/
├── index.html
├── app.js
├── style.css
├── worker.js          # now includes computeScore, deterministicExplanation, getExplanation, validateAgainstSource
├── scoring.js           # NEW — pure deterministic scoring + fallback explanation, isolated so it's independently unit-testable with zero network/LLM dependency
├── data.json
├── wrangler.toml         # add ENABLE_LLM_EXPLANATIONS var + AUDIT_DB (D1) binding
├── package.json
└── README.md
```

`scoring.js` split out deliberately: it's the piece that has to be testable in complete isolation
— no mocking an LLM, no network call, just inputs and outputs — because it's the piece an auditor
or a broker compliance review would actually want to inspect.
