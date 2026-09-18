# CLAUDE.md - Agent Policy

## Scope

This repository is a real-estate prospecting web app with deterministic scoring, static frontend assets, worker code, and synthetic Arizona hidden-equity data generation.

Allowed agent work:

- Edit application source files, static assets, README/docs, and tests when the requested change is explicit.
- Improve deterministic scoring logic with documented rules and reviewable test coverage.
- Maintain synthetic-data generation scripts and non-secret sample fixtures.
- Update governance files and ignore rules that reduce agent or credential risk.

Forbidden agent work:

- Do not commit real prospect lists, homeowner records, private MLS exports, CRM exports, or title/financial data.
- Do not commit `.env`, API keys, Cloudflare tokens, database URLs, Supabase/Postgres credentials, or production service credentials.
- Do not scrape live services or enrich people/property records without explicit human approval.
- Do not rotate secrets, rewrite git history, or delete tracked files without explicit human approval.

## Human Approval Triggers

Ask a human before:

- Adding a database, Supabase/Postgres integration, CRM integration, paid API, email/SMS provider, or production deployment credential.
- Handling non-synthetic personal/property data or changing the data retention boundary.
- Moving or deleting tracked spreadsheet/document fixtures.
- Changing deterministic scoring rules in a way that affects lead ranking or outreach priority.

## Data And Export Boundary

Spreadsheet and document exports must be synthetic fixtures or regenerated local outputs. Generated exports such as `*.xlsx`, `*.xls`, `*.csv`, and `*.docx` should stay out of git unless they are intentionally retained as fixtures and documented in this file.

Current tracked fixtures/exports:

- `synthetic_hidden_equity_data_az (1).xlsx` - synthetic generated sample export; do not replace with real prospect data.
- `scoresummary.docx` - local summary document; do not replace with client/private data.
- `data.json` and `faq-data.js` - app data; keep synthetic or public-safe.

## Secrets Boundary

Use environment variables or platform-managed secrets for all credentials. Keep `.env` local and gitignored. Never place real secret values in `.env.example` or docs.

## Agent Access Boundary

This repo mixes app code, static assets, and generated data. Agents should prefer app source and docs (`app.js`, `worker.js`, `scoring.js`, `*.css`, `*.html`, `README.md`) and avoid opening spreadsheet/document exports unless the task explicitly concerns fixture handling.
