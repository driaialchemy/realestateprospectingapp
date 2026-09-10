export const SCORING_MODEL_VERSION = "v1.1.0";

const MAX_EQUITY = 900000;
const MAX_TREND = 6;

export const TENURE_READINESS_BUCKETS = [
  { min: 5, max: 14, index: 100.0, basis: "empirical" },
  { min: 15, max: 24, index: 75.7, basis: "empirical" },
  { min: 25, max: 34, index: 68.8, basis: "empirical" },
  { min: 35, max: 999, index: 58.5, basis: "extrapolated" },
];

export function tenureReadinessIndex(years) {
  const tenure = Number(years) || 0;
  if (tenure < 5) return Math.round((tenure / 5) * 30 * 10) / 10;
  const bucket = TENURE_READINESS_BUCKETS.find((b) => tenure >= b.min && tenure <= b.max);
  return bucket ? bucket.index : 58.5;
}

export function computeScore(lead) {
  const equity = Math.max(Number(lead.estimated_equity) || 0, 0);
  const trend = Math.max(Number(lead.zip_zhvi_1yr_change_pct) || 0, 0);
  const engagement = Math.max(Math.min(Number(lead.engagement_score_0_100) || 0, 100), 0);
  const tenure = Number(lead.ownership_tenure_years) || 0;

  const equityComponent = Math.min(equity / MAX_EQUITY, 1) * 40;
  const tenureComponent = (tenureReadinessIndex(tenure) / 100) * 25;
  const trendComponent = Math.min(trend / MAX_TREND, 1) * 20;
  const engagementComponent = (engagement / 100) * 15;

  return {
    score: Math.round((equityComponent + tenureComponent + trendComponent + engagementComponent) * 10) / 10,
    model_version: SCORING_MODEL_VERSION,
  };
}

export function extractNumbers(values) {
  const numbers = [];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      numbers.push(value);
      continue;
    }
    const matches = String(value ?? "").match(/-?\d+(?:\.\d+)?/g) || [];
    for (const match of matches) numbers.push(Number(match));
  }
  return numbers;
}

export function validateAgainstSource(reasons, lead) {
  const equity = Number(lead.estimated_equity) || 0;
  const sourceNumbers = extractNumbers([
    lead.estimated_equity,
    Math.round(equity / 1000),
    lead.ownership_tenure_years,
    lead.zip_zhvi_1yr_change_pct,
    lead.engagement_score_0_100,
    lead.tenure_readiness_index,
  ]);

  for (const line of reasons) {
    for (const n of extractNumbers([line])) {
      const matchesSource = sourceNumbers.some((source) => {
        if (source === 0) return n === 0;
        return Math.abs(source - n) < Math.abs(source) * 0.02 || Math.abs(source - n) < 1;
      });
      if (!matchesSource) return false;
    }
  }

  return true;
}

export function deterministicExplanation(lead) {
  const reasons = [];
  const equity = Number(lead.estimated_equity) || 0;
  const tenure = Number(lead.ownership_tenure_years) || 0;
  const trend = Number(lead.zip_zhvi_1yr_change_pct) || 0;
  const engagement = Number(lead.engagement_score_0_100) || 0;
  const readiness = Number(lead.tenure_readiness_index ?? tenureReadinessIndex(tenure));

  if (equity > 100000) {
    reasons.push(`~$${Math.round(equity / 1000)}K estimated equity`);
  }
  if (tenure > 7) {
    reasons.push(`${tenure.toFixed(1)} years in home with ${readiness}/100 tenure readiness`);
  }
  if (trend > 5) {
    reasons.push(`${trend.toFixed(1)}% ZIP appreciation, past 12mo`);
  }
  if (reasons.length < 3 && trend > 0 && !reasons.some((reason) => reason.includes("ZIP appreciation"))) {
    reasons.push(`${trend.toFixed(1)}% ZIP appreciation, past 12mo`);
  }
  if (reasons.length < 3 && engagement >= 60) {
    reasons.push(`${Math.round(engagement)}/100 CRM engagement score`);
  }
  if (reasons.length < 2 && equity > 0 && !reasons.some((reason) => reason.includes("equity"))) {
    reasons.push(`~$${Math.round(equity / 1000)}K estimated equity`);
  }
  if (reasons.length < 2 && tenure > 0 && !reasons.some((reason) => reason.includes("years in home"))) {
    reasons.push(`${tenure.toFixed(1)} years in home with ${readiness}/100 tenure readiness`);
  }
  if (reasons.length < 2) {
    reasons.push(`${Math.round(engagement)}/100 CRM engagement score`);
  }
  if (reasons.length < 2 && lead.relationship_type) {
    reasons.push(`${lead.relationship_type} relationship in CRM`);
  }

  return reasons.slice(0, 3);
}

export function getExplanation(lead, env = {}) {
  const fallback = deterministicExplanation(lead);
  const enabled = env.ENABLE_LLM_EXPLANATIONS === true || env.ENABLE_LLM_EXPLANATIONS === "true";

  if (!enabled) {
    return { reasons: fallback, source: "deterministic" };
  }

  return { reasons: fallback, source: "deterministic" };
}

export function normalizeLead(lead, env = {}) {
  const computed = computeScore(lead);
  const explanation = getExplanation(lead, env);

  return {
    ...lead,
    propensity_score: Number(lead.propensity_score ?? computed.score),
    scoring_model_version: lead.scoring_model_version || computed.model_version,
    reasons: explanation.reasons,
    explanation_source: explanation.source,
  };
}
