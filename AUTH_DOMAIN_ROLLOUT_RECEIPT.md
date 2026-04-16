# Algo-Rhythm Auth and Domain Rollout Receipt

## Target

- Domain: `algo.mrksylvstr.com`
- Hosting project: existing Algo-Rhythm Vercel project
- Auth provider: dedicated Algo-Rhythm Clerk instance from Vercel
  `VITE_CLERK_PUBLISHABLE_KEY`
- Auth boundary: Clerk UI gate only

## Status As Of 2026-04-16

- Clerk UI gate: implemented in the static React shell
- Vercel env var `VITE_CLERK_PUBLISHABLE_KEY`: configured for Production and
  verified to render Algo-Rhythm Clerk branding
- Vercel custom domain: `algo.mrksylvstr.com` added to the Algo-Rhythm project
- Cloudflare DNS record: active, DNS-only `A` record to Vercel
- Vercel domain verification: passed
- HTTPS certificate: issued for `algo.mrksylvstr.com`
- GitHub Actions deployment: passed on runs `24520601622`, `24520678802`, and `24522697119`
- Static data verification: passed on `https://algo.mrksylvstr.com/data/dashboard_index.json`
- Signed-out browser QA: passed on `https://algo.mrksylvstr.com`
- Signed-in browser QA: requires local non-repo Playwright storage state
- Clerk project guardrail: do not reuse ThetaFrame Clerk credentials for this app
- Algo-Rhythm Clerk production CNAMEs: created in Cloudflare and waiting on
  Clerk-side domain verification/certificate completion

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
- Receipt: `scripts/test-results/algo-rhythm-dashboard-browser-qa/2026-04-16T16-49-50-856Z/receipt.json`

## Security Notes

- No raw Vercel, Cloudflare, or Clerk secret values are recorded here.
- `/data/*` and `/downloads/*` remain static public assets if directly requested.
- Full asset protection is a separate future edge/server/domain-access pass.
