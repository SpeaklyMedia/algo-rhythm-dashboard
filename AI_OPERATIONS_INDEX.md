# Algo-Rhythm AI Operations Index

## Purpose

This is the first file an AI/operator should read before changing deployment,
auth, domain, dashboard data, or QA wiring for `SpeaklyMedia/algo-rhythm-dashboard`.

It records where the current operational truth lives without exposing secret
values. Do not add tokens, secret keys, raw `.env` contents, browser storage
state, or Cloudflare zone IDs to this public repository.

## Current Production State

- Public repository: `https://github.com/SpeaklyMedia/algo-rhythm-dashboard`
- Live custom domain: `https://algo.mrksylvstr.com`
- Vercel fallback domain: `https://algo-rhythm-dashboard.vercel.app`
- Hosting: existing Vercel project `algo-rhythm-dashboard`
- Auth: Clerk UI gate using the existing `mrksylvstr.com` Clerk production setup
- Auth boundary: UI gate only; direct `/data/*` and `/downloads/*` assets remain public if known
- Signed-in workflow: `/review` reviewer workspace with local draft persistence and downloadable JSON/Markdown receipts
- Static app package: `artifacts/strategy-dashboard`
- Runtime data: bundled `artifacts/strategy-dashboard/public/data/*.json`
- Runtime downloads: bundled `artifacts/strategy-dashboard/public/downloads/*`
- Browser QA harness: `scripts/src/runStrategyDashboardBrowserQa.ts`
- Active first-collaborator handoff: `BETA_COLLABORATOR_HANDOFF_R36.md`
- Operator intake guide: `BETA_OPERATOR_INTAKE_R36.md`
- First-collaborator session receipt: `BETA_COLLABORATOR_SESSION_RECEIPT_R37.md`
- First-collaborator synthesis: `BETA_COLLABORATOR_SYNTHESIS_R37.md`
- Collaborator 2 expansion gate: `BETA_COLLABORATOR2_GO_NO_GO_R37.md`

## Source-Of-Truth Files

- Auth/domain runbook: `AUTH_DOMAIN_RUNBOOK.md`
- Auth/domain rollout receipt: `AUTH_DOMAIN_ROLLOUT_RECEIPT.md`
- Vercel deployment guide: `VERCEL_DEPLOY.md`
- Vercel project config: `vercel.json`
- GitHub Actions workflow: `.github/workflows/vercel-preview.yml`
- Dashboard app: `artifacts/strategy-dashboard/src/App.tsx`
- Dashboard styles: `artifacts/strategy-dashboard/src/index.css`
- Dashboard data contract: `artifacts/strategy-dashboard/public/data/dashboard_index.json`
- Reviewer workflow implementation: `artifacts/strategy-dashboard/src/App.tsx`
- First collaborator beta handoff: `BETA_COLLABORATOR_HANDOFF_R36.md`
- Operator receipt intake: `BETA_OPERATOR_INTAKE_R36.md`
- R37 first collaborator receipt: `BETA_COLLABORATOR_SESSION_RECEIPT_R37.md`
- R37 first collaborator synthesis: `BETA_COLLABORATOR_SYNTHESIS_R37.md`
- R37 collaborator 2 go/no-go: `BETA_COLLABORATOR2_GO_NO_GO_R37.md`

## Required Environment And Secrets

Vercel project environment:

- `VITE_CLERK_PUBLISHABLE_KEY`: required for the Clerk UI gate.

GitHub Actions repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Never commit:

- `CLERK_SECRET_KEY`
- Cloudflare API tokens
- Vercel tokens
- GitHub tokens
- raw `.env` files
- Playwright or browser auth storage state
- receipts containing unmasked secret values

## Domain And DNS Facts

`algo.mrksylvstr.com` is attached to the existing Algo-Rhythm Vercel project.

Cloudflare DNS shape:

```text
Type: A
Name: algo
Value: 76.76.21.21
Proxy: DNS only
```

If DNS is valid but HTTPS is not serving, issue the Vercel certificate:

```sh
vercel certs issue algo.mrksylvstr.com --scope marks-projects-f03fd1cc
```

Do not publish Cloudflare zone IDs or token locations in this repo. Use the
local/private operations index in the project workspace if local credential
discovery is required.

## Safe Verification Commands

Static build gates:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/strategy-dashboard run typecheck
pnpm --filter @workspace/strategy-dashboard run build
```

Production data contract check:

```sh
curl -sS https://algo.mrksylvstr.com/data/dashboard_index.json | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); r=d["review_mode"]; print(r["review_mode"], r["cohort_size"], r["recommended_run_id"])'
```

Signed-out browser QA:

```sh
DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com pnpm --filter @workspace/scripts run qa:dashboard
```

The browser QA checks desktop, tablet, mobile, and narrow-mobile viewports. It
fails on document-level horizontal overflow and only allows wide table content
to scroll inside `.table-scroll` containers.

Signed-in reviewer workflow QA requires a local Playwright storage state file outside the repo:

```sh
DASHBOARD_QA_AUTH_MODE=signed-in \
DASHBOARD_QA_STORAGE_STATE=/path/outside/repo/algo-clerk-storage-state.json \
DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com \
pnpm --filter @workspace/scripts run qa:dashboard
```

GitHub Actions status:

```sh
gh run list --repo SpeaklyMedia/algo-rhythm-dashboard --limit 5 \
  --json databaseId,status,conclusion,headSha,name,url,createdAt
```

## Expected Current Dashboard Contract

- `review_mode.review_mode`: `multi_run_review`
- `review_mode.review_scope`: `reviewed_run_cohort`
- `review_mode.cohort_size`: `4`
- `review_mode.recommended_run_id`: `20260414T232200Z`
- Included run IDs:
  - `20260414T232200Z`
  - `20260414T232000Z`
  - `20260414T232500Z`
  - `20260416T124500Z`

## Change Discipline

- Do not add a backend or runtime API dependency for this app.
- Do not change page IDs or route meanings without an explicit contract update.
- Do not hardcode Clerk publishable keys; keep them in Vercel env vars.
- Do not make Cloudflare records proxied until Vercel validation and app behavior are intentionally retested behind Cloudflare.
- Do not treat signed-out browser QA as proof of signed-in functionality. Signed-in QA requires a local, untracked Playwright storage state file.
- Do not treat local reviewer receipts as submitted feedback. They are downloaded operator-intake artifacts until a later persistence layer exists.
- Do not invite collaborator 2 until collaborator 1 exports usable receipts with no unresolved `contract_gap`, `handoff_packet_gap`, or `operational_regression`.
- Do not commit raw R37 collaborator receipts or screenshots with account data; summarize them in the sanitized R37 files only.
