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
- Auth: Clerk UI gate using the dedicated Algo-Rhythm Clerk instance configured
  by Vercel `VITE_CLERK_PUBLISHABLE_KEY`
- Auth boundary: UI gate only; direct `/data/*` and `/downloads/*` assets remain public if known
- Signed-in workflow: `/workspace` strategy workspace with localStorage draft
  persistence and downloadable strategy JSON/Markdown exports
- Secondary approval workflow: `/review` reviewer workspace with local draft
  persistence and downloadable reviewer JSON/Markdown receipts
- Static app package: `artifacts/strategy-dashboard`
- Runtime data: bundled `artifacts/strategy-dashboard/public/data/*.json`
- Runtime downloads: bundled `artifacts/strategy-dashboard/public/downloads/*`
- Browser QA harness: `scripts/src/runStrategyDashboardBrowserQa.ts`
- Clerk auth-state recorder: `scripts/src/recordClerkDashboardAuthState.ts`
- Share preview image: `artifacts/strategy-dashboard/public/opengraph.jpg`
- Active first-collaborator handoff: `BETA_COLLABORATOR_HANDOFF_R36.md`
- Operator intake guide: `BETA_OPERATOR_INTAKE_R36.md`
- First-collaborator session receipt: `BETA_COLLABORATOR_SESSION_RECEIPT_R37.md`
- First-collaborator synthesis: `BETA_COLLABORATOR_SYNTHESIS_R37.md`
- Collaborator 2 expansion gate: `BETA_COLLABORATOR2_GO_NO_GO_R37.md`
- Strategy workspace product contract: `STRATEGY_WORKSPACE_PRODUCT_CONTRACT.md`

## Source-Of-Truth Files

- Auth/domain runbook: `AUTH_DOMAIN_RUNBOOK.md`
- Auth/domain rollout receipt: `AUTH_DOMAIN_ROLLOUT_RECEIPT.md`
- Vercel deployment guide: `VERCEL_DEPLOY.md`
- Vercel project config: `vercel.json`
- GitHub Actions workflow: `.github/workflows/vercel-preview.yml`
- Dashboard app: `artifacts/strategy-dashboard/src/App.tsx`
- Dashboard styles: `artifacts/strategy-dashboard/src/index.css`
- Dashboard HTML/share metadata: `artifacts/strategy-dashboard/index.html`
- Dashboard data contract: `artifacts/strategy-dashboard/public/data/dashboard_index.json`
- Strategy workspace implementation: `artifacts/strategy-dashboard/src/App.tsx`
- First collaborator beta handoff: `BETA_COLLABORATOR_HANDOFF_R36.md`
- Operator receipt intake: `BETA_OPERATOR_INTAKE_R36.md`
- R37 first collaborator receipt: `BETA_COLLABORATOR_SESSION_RECEIPT_R37.md`
- R37 first collaborator synthesis: `BETA_COLLABORATOR_SYNTHESIS_R37.md`
- R37 collaborator 2 go/no-go: `BETA_COLLABORATOR2_GO_NO_GO_R37.md`
- Strategy workspace product contract: `STRATEGY_WORKSPACE_PRODUCT_CONTRACT.md`

## Required Environment And Secrets

Vercel project environment:

- `VITE_CLERK_PUBLISHABLE_KEY`: required for the Clerk UI gate.
  This must point at the Algo-Rhythm Clerk project. Do not reuse ThetaFrame
  Clerk credentials.

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

Algo-Rhythm Clerk production DNS shape:

```text
Type: CNAME
Name: clerk.algo
Value: frontend-api.clerk.services
Proxy: DNS only

Type: CNAME
Name: accounts.algo
Value: accounts.clerk.services
Proxy: DNS only

Type: CNAME
Name: clkmail.algo
Value: mail.qr0siahe8a42.clerk.services
Proxy: DNS only

Type: CNAME
Name: clk._domainkey.algo
Value: dkim1.qr0siahe8a42.clerk.services
Proxy: DNS only

Type: CNAME
Name: clk2._domainkey.algo
Value: dkim2.qr0siahe8a42.clerk.services
Proxy: DNS only
```

Do not reuse root-level `clerk.mrksylvstr.com` or `accounts.mrksylvstr.com`
for Algo-Rhythm. Those records can belong to another Clerk app on the same root
domain.

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

Clerk production readiness check:

```sh
pnpm --filter @workspace/scripts run qa:clerk:production-ready
```

This check is intentionally fail-closed. It only returns success after all
Algo-Rhythm Clerk CNAMEs resolve, the two Clerk HTTPS auth endpoints complete
TLS, Vercel lists `VITE_CLERK_PUBLISHABLE_KEY`, and the live dashboard contract
still matches `multi_run_review 4 20260414T232200Z`. It does not print secret
values.

The browser QA checks desktop, tablet, mobile, and narrow-mobile viewports. It
fails on document-level horizontal overflow and only allows wide table content
to scroll inside `.table-scroll` containers.

Signed-in strategy workflow QA requires a local Playwright storage state file outside the repo:

```sh
pnpm --filter @workspace/scripts run qa:dashboard:auth:record
pnpm --filter @workspace/scripts run qa:dashboard:signed-in
```

Signed-in QA now verifies the `/workspace` landing, local strategy edits,
localStorage persistence, draft copy action, strategy JSON/Markdown exports,
the secondary `/review` reviewer receipt workflow, admin trust routes, download
endpoints, and no dashboard-origin write requests.

The default private storage-state path is:

```text
/home/mark/.local/state/algo-rhythm-dashboard/playwright/algo-clerk-storage-state.json
```

You can still override it explicitly:

```sh
DASHBOARD_QA_AUTH_MODE=signed-in \
DASHBOARD_QA_STORAGE_STATE=/path/outside/repo/algo-clerk-storage-state.json \
DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com \
pnpm --filter @workspace/scripts run qa:dashboard
```

Share preview check:

```sh
curl -sS https://algo.mrksylvstr.com/ | rg 'og:image|twitter:image|canonical'
curl -I https://algo.mrksylvstr.com/opengraph.jpg
```

The share preview image and metadata are public. They do not imply protection
for direct `/data/*`, `/downloads/*`, or `/opengraph.jpg` URLs.

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
- Do not assume another `mrksylvstr.com` app's Clerk project is valid for this
  app. Verify `/sign-in` shows Algo-Rhythm branding before recording signed-in
  Playwright state.
- Do not make Cloudflare records proxied until Vercel validation and app behavior are intentionally retested behind Cloudflare.
- Do not treat signed-out browser QA as proof of signed-in functionality. Signed-in QA requires a local, untracked Playwright storage state file.
- Do not write Playwright storage state inside the Git checkout. Use the default private path or another explicit path outside the repo.
- Do not treat local reviewer receipts or strategy exports as submitted feedback. They are downloaded operator-intake artifacts until a later persistence layer exists.
- Do not treat local strategy workspace exports as private cloud storage. They
  are browser-local drafts and downloaded files only.
- Do not add social posting automation, social account connections, scraping,
  bulk outreach, or autonomous posting to the strategy workspace.
- Do not invite collaborator 2 until collaborator 1 exports usable strategy files and any requested reviewer receipts with no unresolved `contract_gap`, `handoff_packet_gap`, or `operational_regression`.
- Do not commit raw R37 collaborator receipts or screenshots with account data; summarize them in the sanitized R37 files only.
