# Algo-Rhythm Clerk Auth and Custom Domain Runbook

## Current Model

`algo.mrksylvstr.com` uses a Clerk UI gate in front of the static Algo-Rhythm dashboard.

- Hosting: existing Vercel project for `SpeaklyMedia/algo-rhythm-dashboard`
- Auth: existing `mrksylvstr.com` Clerk production instance
- Domain: `algo.mrksylvstr.com`
- Static runtime: bundled `/data/*.json` and `/downloads/*`

This is not full asset secrecy. Clerk prevents normal dashboard use unless signed in, but direct static asset URLs remain public if known.

## Required Vercel Environment Variable

Set this on the Algo-Rhythm Vercel project:

```text
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

Do not configure or commit `CLERK_SECRET_KEY` for this static UI-gate pass.

## Clerk Production Expectations

Reuse the existing `mrksylvstr.com` Clerk production setup:

- Frontend API domain: `clerk.mrksylvstr.com`
- Accounts portal: `accounts.mrksylvstr.com`
- Allowed application URL: `https://algo.mrksylvstr.com`
- Optional fallback/debug URL: `https://algo-rhythm-dashboard.vercel.app`

Do not force `VITE_CLERK_PROXY_URL` unless Clerk production configuration explicitly requires it.

## Vercel and Cloudflare Domain Steps

1. Add `algo.mrksylvstr.com` to the existing Algo-Rhythm Vercel project.
2. Inspect the Vercel-required DNS target.
3. In Cloudflare DNS for `mrksylvstr.com`, create or update:

```text
Type: CNAME
Name: algo
Target: Vercel-provided DNS target
Proxy: DNS only until Vercel validates TLS
```

4. Verify Vercel marks the domain valid and HTTPS is issued.
5. Verify `https://algo.mrksylvstr.com` renders Clerk sign-in while signed out.

## QA Commands

Static build gates:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/strategy-dashboard run typecheck
pnpm --filter @workspace/strategy-dashboard run build
```

Signed-out production browser gate:

```sh
DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com pnpm --filter @workspace/scripts run qa:dashboard
```

Local preview with the production Clerk key must use an allowed `mrksylvstr.com` host. Run Vite preview locally, then map the host inside Chromium:

```sh
DASHBOARD_QA_BASE_URL=http://algo.mrksylvstr.com:3004 \
DASHBOARD_QA_HOST_RESOLVER_RULES='MAP algo.mrksylvstr.com 127.0.0.1' \
pnpm --filter @workspace/scripts run qa:dashboard
```

Signed-in browser gate requires a local Playwright storage state file created outside the repo:

```sh
DASHBOARD_QA_AUTH_MODE=signed-in \
DASHBOARD_QA_STORAGE_STATE=/path/outside/repo/algo-clerk-storage-state.json \
DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com \
pnpm --filter @workspace/scripts run qa:dashboard
```

Never commit browser storage state files.

## Secret Handling

Do not commit:

- Cloudflare API tokens
- Vercel tokens
- Clerk secret keys
- raw `.env` files
- Playwright auth storage state
- receipts containing unmasked secret values

The Clerk publishable key is safe to expose in the frontend bundle, but still configure it through Vercel env vars rather than hardcoding it.
