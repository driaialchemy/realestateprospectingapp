version: 1
repository: realestateprospectingapp
risk_level: high
scope:
  summary: Real-estate prospecting web app with deterministic scoring and synthetic hidden-equity data generation.
  preferred_paths:
    - app.js
    - worker.js
    - scoring.js
    - desert.js
    - hero.js
    - faq-widget.js
    - faq-data.js
    - index.html
    - landing.html
    - style.css
    - landing.css
    - README.md
    - generate_synthetic_data_az.py
    - CLAUDE.md
    - AGENTS.md
  restricted_paths:
    - synthetic_hidden_equity_data_az (1).xlsx
    - scoresummary.docx
    - data.json
allowed_actions:
  - edit_static_app_source
  - improve_deterministic_scoring_with_tests_or_docs
  - maintain_synthetic_data_generation
  - update_governance_and_ignore_rules
forbidden_actions:
  - commit_real_prospect_or_homeowner_data
  - commit_private_mls_crm_title_or_financial_exports
  - commit_env_files_or_secret_values
  - add_live_scraping_or_enrichment_without_approval
  - rotate_secrets_without_approval
  - destructive_git_history_rewrite
human_approval_required_for:
  - database_or_supabase_or_postgres_integration
  - crm_email_sms_or_paid_api_integration
  - production_deployment_credentials
  - non_synthetic_personal_or_property_data
  - lead_scoring_rule_changes_affecting_ranking
  - moving_or_deleting_tracked_fixture_exports
secrets:
  source: environment_variables_or_platform_managed_secrets
  never_commit:
    - .env
    - .env.*
    - api_keys
    - cloudflare_tokens
    - database_urls
    - supabase_or_postgres_credentials
data_policy:
  allowed: synthetic_or_public_safe_fixtures
  generated_exports_gitignored:
    - "*.xlsx"
    - "*.xls"
    - "*.csv"
    - "*.docx"
  tracked_fixture_notes:
    - "synthetic_hidden_equity_data_az (1).xlsx is a synthetic sample export; do not replace with real data."
    - "scoresummary.docx is a local summary fixture; do not replace with private data."
