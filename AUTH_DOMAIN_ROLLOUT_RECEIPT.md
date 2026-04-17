# Algo-Rhythm Auth and Domain Rollout Receipt

## Target

- Domain: `algo.mrksylvstr.com`
- Hosting project: existing Algo-Rhythm Vercel project
- Auth provider: dedicated Algo-Rhythm Clerk production instance from Vercel
  `VITE_CLERK_PUBLISHABLE_KEY`
- Auth boundary: Clerk UI gate only

## Status As Of 2026-04-17

- Clerk UI gate: implemented in the static React shell
- Vercel env var `VITE_CLERK_PUBLISHABLE_KEY`: configured for Production with
  the dedicated Algo Clerk production publishable key
- Vercel custom domain: `algo.mrksylvstr.com` added to the Algo-Rhythm project
- Cloudflare DNS record: active, DNS-only `A` record to Vercel
- Vercel domain verification: passed
- HTTPS certificate: issued for `algo.mrksylvstr.com`
- GitHub Actions deployment: passed on runs `24520601622`, `24520678802`, and `24522697119`
- Static data verification: passed on `https://algo.mrksylvstr.com/data/dashboard_index.json`
- Signed-out browser QA: passed on `https://algo.mrksylvstr.com`
- Google OAuth social connection: enabled in the dedicated Algo-Rhythm Clerk
  production instance with custom Google credentials and sign-up/sign-in enabled
- Signed-in browser QA: requires refreshed local non-repo Playwright storage
  state after the production Clerk key switch
- Clerk project guardrail: do not reuse ThetaFrame Clerk credentials for this app
- Algo-Rhythm Clerk production CNAMEs: created in Cloudflare
- Algo-Rhythm Clerk production TLS: verified for both auth subdomains
- Production redeploy after Clerk key switch: `dpl_FaYxg6h2z8GpGw65Pgu68A1aT9RR`

## DNS Configuration

The active Cloudflare DNS record is:

```text
Type: A
Name: algo
Value: 76.76.21.21
Proxy: DNS only
```

The Algo-Rhythm Clerk production DNS records are:

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

Vercel API checks reported the project domain as verified and the domain config as not
misconfigured. The certificate was issued with:

```sh
vercel certs issue algo.mrksylvstr.com --scope marks-projects-f03fd1cc
```

## Verified Static Contract

- `review_mode`: `multi_run_review`
- `cohort_size`: `4`
- `recommended_run_id`: `20260414T232200Z`
- latest batch review id: `20260416T134500Z`
- Representative batch download returned HTTP 200 from the custom domain.

## Browser QA Evidence

- Command: `DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com pnpm --filter @workspace/scripts run qa:dashboard`
- Auth mode: signed out
- Routes checked: `/`, `/strategy`, `/review`, `/package`, `/batch`, `/handoff`
- Latest receipt after enabling Clerk Google OAuth:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T01-17-41-282Z/receipt.json`
- Google-required QA flag: `DASHBOARD_QA_EXPECT_CLERK_GOOGLE=1`
- Google click-through smoke: `Continue with Google` reached Google Accounts
  using Clerk's `https://clerk.algo.mrksylvstr.com/v1/oauth_callback` redirect
  and did not reproduce the prior Clerk 422 strategy error.

- Signed-in browser QA: passed after refreshing private Clerk Playwright
  storage state outside the repo on 2026-04-17.
- Signed-in command: `pnpm --filter @workspace/scripts run qa:dashboard:signed-in`
- Signed-in receipt:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T01-28-44-090Z/receipt.json`
- Signed-in coverage included `/sign-in` to `/review` redirect, authenticated
  route rendering, reviewer completion state, JSON receipt additive fields,
  Markdown summary content, package/batch trust indicators, download endpoints,
  and no dashboard-origin write requests.

## Security Notes

- No raw Vercel, Cloudflare, or Clerk secret values are recorded here.
- `/data/*` and `/downloads/*` remain static public assets if directly requested.
- Full asset protection is a separate future edge/server/domain-access pass.
