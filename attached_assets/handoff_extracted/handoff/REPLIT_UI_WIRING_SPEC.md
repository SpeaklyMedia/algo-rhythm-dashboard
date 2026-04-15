# Replit UI Wiring Spec

## Data mode
The app is static only. It must read from:
- `public/data/*.json`
- `public/downloads/*`

It must not read from:
- repo-relative paths outside the app root
- live APIs
- server routes

## Source of truth
- App-level index: `public/data/dashboard_index.json`
- Required/optional behavior is declared in `dashboard_index.json`

## Required datasets
- `latest_run`
- `latest_review`
- `latest_package`
- `latest_batch`
- `content_object`
- `trend_shortlist`
- `platform_signal_selection`
- `viability_scorecard`
- `four_tier_adaptations`
- `experiment_plan`
- `promotion_recommendation`
- `run_comparison_scorecard`
- `run_review_index`
- `package_manifest`
- `batch_manifest`

## Optional datasets
- `campaign_ledger_seed`
- `selected_signal_cards`
- `run_package_index`

## Page-to-dataset mapping
- `Overview`: `latest_run`, `latest_review`, `latest_package`, `latest_batch`
- `Strategy`: `content_object`, `trend_shortlist`, `platform_signal_selection`, `viability_scorecard`, `four_tier_adaptations`, `experiment_plan`, optional `campaign_ledger_seed`
- `Review`: `promotion_recommendation`, `run_comparison_scorecard`, `run_review_index`
- `Package`: `latest_package`, `package_manifest`, optional `selected_signal_cards`
- `Batch`: `latest_batch`, `batch_manifest`, optional `run_package_index`
- `Handoff`: `dashboard_index.json` plus bundled downloads metadata

## Failure behavior
- Missing required dataset: block the relevant page with a visible error panel
- Missing optional dataset: show `Unavailable` and keep the rest of the page usable

## Downloads
Only use `public/downloads/`.
- Bundled downloads are safe to expose directly.
- Non-bundled archives should remain metadata-only unless explicitly seeded into `public/downloads/`.
