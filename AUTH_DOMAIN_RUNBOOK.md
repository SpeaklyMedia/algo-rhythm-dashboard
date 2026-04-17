# Algo-Rhythm Clerk Auth and Custom Domain Runbook

Read `AI_OPERATIONS_INDEX.md` first for the current safe source-of-truth map,
verification commands, and secret-handling rules.

For the first supervised collaborator beta, use `BETA_COLLABORATOR_HANDOFF_R36.md`
and `BETA_OPERATOR_INTAKE_R36.md`.

## Current Model

`algo.mrksylvstr.com` uses a Clerk UI gate in front of the static Algo-Rhythm dashboard.

- Hosting: existing Vercel project for `SpeaklyMedia/algo-rhythm-dashboard`
- Auth: dedicated Algo-Rhythm Clerk instance configured by the Vercel
  `VITE_CLERK_PUBLISHABLE_KEY` environment variable
- Google OAuth: exposed only by Clerk's built-in `<SignIn />` component after
  Google is enabled for sign-up and sign-in in the dedicated Algo-Rhythm Clerk
  instance. The app does not call `oauth_google` directly and does not own
  Google OAuth secrets or callback handlers.
- Domain: `algo.mrksylvstr.com`
- Static runtime: bundled `/data/*.json` and `/downloads/*`

This is not full asset secrecy. Clerk prevents normal dashboard use unless signed in, but direct static asset URLs remain public if known.

## Required Vercel Environment Variable

Set this on the Algo-Rhythm Vercel project:

```text
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

Do not configure or commit `CLERK_SECRET_KEY` for this static UI-gate pass.

## Clerk Instance Expectations

Use the Clerk project dedicated to the Algo-Rhythm app. Do not reuse the
ThetaFrame Clerk project or assume `mrksylvstr.com` production Clerk credentials
are correct for this app.

- Clerk sign-in branding should show Algo-Rhythm, not ThetaFrame.
- The signed-out `/sign-in` page should expose Clerk's email/password form.
- After Google is enabled in Clerk Dashboard, the same built-in Clerk form
  should expose `Continue with Google`.
- Vercel should hold only `VITE_CLERK_PUBLISHABLE_KEY` for the frontend UI gate.
- The publishable key may be `pk_live_...` for production or `pk_test_...` for a
  Clerk development/test instance during supervised beta.
- Allowed application URL: `https://algo.mrksylvstr.com`
- Optional fallback/debug URL: `https://algo-rhythm-dashboard.vercel.app`

Do not force `VITE_CLERK_PROXY_URL` unless the dedicated Algo-Rhythm Clerk
configuration explicitly requires it.

To make browser QA fail if Clerk's built-in Google option is missing after
Dashboard configuration, run signed-out QA with:

```text
DASHBOARD_QA_EXPECT_CLERK_GOOGLE=1
```

## Clerk DNS Records For Algo-Rhythm

The Algo-Rhythm Clerk production instance uses DNS below the app subdomain so it
does not collide with the separate root-level Clerk setup used by other
`mrksylvstr.com` apps.

Configure these records in Cloudflare as DNS-only CNAMEs:

```text
Type: CNAME
Name: clerk.algo
Target: frontend-api.clerk.services
Proxy: DNS only

Type: CNAME
Name: accounts.algo
Target: accounts.clerk.services
Proxy: DNS only

Type: CNAME
Name: clkmail.algo
Target: mail.qr0siahe8a42.clerk.services
Proxy: DNS only

Type: CNAME
Name: clk._domainkey.algo
Target: dkim1.qr0siahe8a42.clerk.services
Proxy: DNS only

Type: CNAME
Name: clk2._domainkey.algo
Target: dkim2.qr0siahe8a42.clerk.services
Proxy: DNS only
```

Do not reuse `clerk.mrksylvstr.com` or `accounts.mrksylvstr.com` for this app.
Those records belong to the root-level Clerk setup and caused the app to load
the wrong product branding.

After Clerk validates the CNAMEs and issues certificates, update the Vercel
`VITE_CLERK_PUBLISHABLE_KEY` value from the Algo-Rhythm Clerk production
instance and redeploy. Keep the current working key in place until the Clerk
production domain is verified.

## Vercel and Cloudflare Domain Steps

1. Add `algo.mrksylvstr.com` to the existing Algo-Rhythm Vercel project.
2. Inspect the Vercel-required DNS target.
3. In Cloudflare DNS for `mrksylvstr.com`, create or update:

```text
Type: A
Name: algo
Target: 76.76.21.21
Proxy: DNS only until Vercel validates TLS
```

4. Verify Vercel marks the domain valid and HTTPS is issued. If DNS is valid but
   TLS is not serving yet, issue the certificate explicitly:

```sh
vercel certs issue algo.mrksylvstr.com --scope marks-projects-f03fd1cc
```

5. Verify `https://algo.mrksylvstr.com` renders Clerk sign-in while signed out.

## Credential Lookup Rules

Use credential material only through local CLI/API calls. Do not paste tokens,
zone IDs, or raw environment values into docs, commits, receipts, screenshots,
or shell output.

When Cloudflare DNS work is needed:

- Prefer the Cloudflare dashboard or an already-provisioned local API token with
  `Zone Read` and `DNS Edit` scoped to `mrksylvstr.com`.
- Validate capability by checking API success/failure only; print status and
  masked record IDs, never token values.
- Do not commit Cloudflare zone IDs. The domain name and DNS record shape are
  enough for public runbook documentation.
- Keep Cloudflare records for Vercel custom domains `DNS only` until Vercel has
  validated the domain and issued HTTPS.

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

Clerk production readiness gate:

```sh
pnpm --filter @workspace/scripts run qa:clerk:production-ready
```

Run this before switching Vercel to the dedicated Algo production `pk_live_...`.
It exits non-zero while Clerk DNS, Clerk auth endpoint TLS, Vercel env presence,
or the live dashboard contract is not ready. It prints status only and does not
print secret values.

Local preview with the configured Clerk key must use an allowed app host. Run
Vite preview locally, then map the host inside Chromium:

```sh
DASHBOARD_QA_BASE_URL=http://algo.mrksylvstr.com:3004 \
DASHBOARD_QA_HOST_RESOLVER_RULES='MAP algo.mrksylvstr.com 127.0.0.1' \
pnpm --filter @workspace/scripts run qa:dashboard
```

Signed-in browser gate requires a local Playwright storage state file created outside the repo:

```sh
pnpm --filter @workspace/scripts run qa:dashboard:auth:record
pnpm --filter @workspace/scripts run qa:dashboard:signed-in
```

In signed-in mode, the QA script verifies the `/review` reviewer workspace by filling
the decision controls, checklist, issue intake, notes, and JSON/Markdown receipt
downloads.

The default storage-state path is:

```text
/home/mark/.local/state/algo-rhythm-dashboard/playwright/algo-clerk-storage-state.json
```

To override the path, use:

```sh
DASHBOARD_QA_AUTH_MODE=signed-in \
DASHBOARD_QA_STORAGE_STATE=/path/outside/repo/algo-clerk-storage-state.json \
DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com \
pnpm --filter @workspace/scripts run qa:dashboard
```

Never commit browser storage state files.

## Share Preview

The public URL preview uses static metadata in `artifacts/strategy-dashboard/index.html`
and the public image `/opengraph.jpg`.

After deploy, verify:

```sh
curl -sS https://algo.mrksylvstr.com/ | rg 'og:image|twitter:image|canonical'
curl -I https://algo.mrksylvstr.com/opengraph.jpg
```

The preview image is intentionally public so text, social, Slack, and iMessage
link unfurlers can display it. It does not protect or expose additional app
data beyond the existing public static asset model.

## Secret Handling

Do not commit:

- Cloudflare API tokens
- Vercel tokens
- Clerk secret keys
- raw `.env` files
- Playwright auth storage state
- receipts containing unmasked secret values

The Clerk publishable key is safe to expose in the frontend bundle, but still configure it through Vercel env vars rather than hardcoding it.
