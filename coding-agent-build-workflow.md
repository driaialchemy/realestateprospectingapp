# Real Estate Prospecting App — Coding Agent Build Workflow

**Target directory (exact, nothing built outside it):**
`C:\Users\msell\OneDrive\AIAlchemy\pioneertitle\realestateprospectingapp`

**Assumption flagged:** "no other sub directories" is read literally below — the build avoids
framework scaffolding (Vite/Next/etc.) that normally creates `src/`, `public/`, `functions/`,
etc. If you actually just meant "don't scatter the project across other folders" (subfolders
inside the project root are fine), say so and I'll swap in a standard Vite + Cloudflare Pages
scaffold instead — it's less unusual for a coding agent to build and easier to extend later.

---

## Stack decision: Cloudflare Workers (not Pages)

Cloudflare Pages is the more common choice, but it wants a `functions/` directory for any API
routes, which breaks the flat-directory constraint. **Cloudflare Workers with the newer static
Assets binding** serves both the frontend and a JSON API from a single `worker.js`, deploys with
one command, and gives you a public `*.workers.dev` URL immediately — no separate hosting piece.
That's the better fit here.

| Layer | Choice |
|---|---|
| Runtime/host | Cloudflare Workers (free tier is enough for this) |
| Frontend | Single `index.html` + `app.js`, no framework, no build step |
| API | Routes inside `worker.js` (`/api/leads`) |
| Data | `data.json` — precomputed scored leads (from the pipeline you already have) |
| Public URL | `<name>.<subdomain>.workers.dev` on deploy; custom domain optional after |

---

## Flat file structure (everything in the one target folder)

```
realestateprospectingapp/
├── index.html          # dashboard UI
├── app.js              # fetches /api/leads, renders table + score explanations
├── style.css
├── worker.js            # Worker entry: serves static assets + /api/leads
├── data.json             # precomputed scored leads (generated from your Python pipeline)
├── wrangler.toml         # Cloudflare config (assets binding, worker name)
├── package.json          # only needs `wrangler` as a devDependency
└── README.md
```

No `src/`, no `public/`, no `functions/`. Nine files, flat.

---

## Step-by-step for the coding agent

1. **Init the folder** at the exact path above. Do not create it under any other directory first
   and move it — create it there directly.
2. **`data.json`** — take the "Scored View (sample)" tab from the synthetic AZ workbook we built
   and export it as JSON (array of lead objects: contact_id, name, metro, zip_code, equity, tenure,
   comp trend, engagement, propensity_score, plus a `reasons` array of 2–3 plain-language strings
   per lead). This is the MVP data source — swap for a live API later without touching the frontend.
3. **`worker.js`** — a single Worker that:
   - Serves `index.html`/`app.js`/`style.css` as static assets (via the `assets` binding in
     `wrangler.toml`, not a separate static host)
   - Exposes `GET /api/leads` returning `data.json`, sorted by `propensity_score` descending
   - Exposes `GET /api/leads/:id` for a single lead's detail/explanation view
4. **`index.html` + `app.js`** — a ranked table (name, ZIP/metro, score, top reason, last contact)
   with client-side sort/filter by relationship type and score threshold. No auth needed for this
   internal-tool MVP; flag that clearly if it'll ever hold real client PII.
5. **`wrangler.toml`** — set `name`, `main = "worker.js"`, `compatibility_date` (today's date),
   and an `[assets]` block pointing at the folder itself for the static files.
6. **Local test:** `wrangler dev` — confirms the dashboard renders and `/api/leads` returns data
   before anything touches the internet.
7. **Deploy:** `wrangler login` (one-time), then `wrangler deploy`. This returns the public
   `*.workers.dev` URL — that's the front-facing URL, live within seconds of deploy.
8. **Optional custom domain:** once you have a domain on Cloudflare DNS, add a route in
   `wrangler.toml` or the dashboard (`Workers & Pages → your worker → Triggers → Custom Domain`).
   Not required to get a working public URL — step 7 already produces one.

---

## Governance note (carried over from the blueprint)

This MVP serves precomputed scores with no live scoring, no auth, and no audit log — fine for a
demo, not fine to hand real client data to. Before this touches actual agent CRM exports, it
needs: an auth gate, an audit trail (Cloudflare D1 or KV logging every score view with model
version/timestamp), and a real ingestion path replacing the static `data.json`. Worth treating as
a separate, explicit step rather than something a coding agent quietly adds or skips.

---

## Handoff prompt (Goal / Format / Guardrails / Context — ready to paste to the coding agent)

**Goal:** Build a Cloudflare Worker app that serves a real estate lead-scoring dashboard, deployed
to a public `*.workers.dev` URL.

**Preferred format:** Flat file structure only — no `src/`, `public/`, or `functions/`
subdirectories. Nine files max: `index.html`, `app.js`, `style.css`, `worker.js`, `data.json`,
`wrangler.toml`, `package.json`, `README.md`. Build directly inside
`C:\Users\msell\OneDrive\AIAlchemy\pioneertitle\realestateprospectingapp` — nothing created
outside that folder.

**Warnings/guardrails:** No framework build step (no Vite/webpack/Next). No auth or PII handling
in this pass — it's a demo over synthetic data. Don't add a database yet; `data.json` is the
source of truth for this iteration. Confirm `wrangler dev` runs clean locally before deploying.

**Context dump:** This dashboard displays AI lead-scoring output for real estate agents — a
"propensity to sell" score per contact, derived from estimated home equity, ownership tenure,
local market comp trend, and CRM engagement, with a plain-language explanation of the top
contributing factors per lead. The data is synthetic but grounded in real Zillow ZHVI Arizona ZIP
data. [Attach `data.json` export here.]

---

## Open items to settle before build

- Whether "no sub directories" is literal (as built above) or just "don't scatter the project" —
  confirm before the coding agent starts
- Whether this needs to survive past a demo (if yes, auth + D1 audit log should be scoped now,
  not bolted on later)
- Custom domain vs. shipping the `*.workers.dev` URL as-is for now
