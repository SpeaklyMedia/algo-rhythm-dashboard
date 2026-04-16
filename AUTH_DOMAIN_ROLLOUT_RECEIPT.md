# Algo-Rhythm Auth and Domain Rollout Receipt

## Target

- Domain: `algo.mrksylvstr.com`
- Hosting project: existing Algo-Rhythm Vercel project
- Auth provider: existing `mrksylvstr.com` Clerk production instance
- Auth boundary: Clerk UI gate only

## Status As Of 2026-04-16

- Clerk UI gate: implemented in the static React shell
- Vercel env var `VITE_CLERK_PUBLISHABLE_KEY`: configured for Production
- Vercel custom domain: `algo.mrksylvstr.com` added to the Algo-Rhythm project
- Cloudflare DNS record: pending zone update
- GitHub Actions deployment: passed on run `24520601622`
- Static data verification: passed on `https://algo-rhythm-dashboard.vercel.app/data/dashboard_index.json`
- Signed-out browser QA: pending `algo.mrksylvstr.com` DNS activation
- Signed-in browser QA: requires local non-repo Playwright storage state

## DNS Action Required

Vercel requested this DNS record:

```text
Type: A
Name: algo
Value: 76.76.21.21
Proxy: DNS only until Vercel validates HTTPS
```

The local Cloudflare token discovered on this machine is active, but it does not expose the
`mrksylvstr.com` zone through zone-list lookup. Do not guess the zone ID. Complete the DNS
record through Cloudflare dashboard access or a zone-scoped token plus the exact zone ID.

## Verified Static Contract

- `review_mode`: `multi_run_review`
- `cohort_size`: `4`
- `recommended_run_id`: `20260414T232200Z`
- `latest_batch_review_id`: `20260416T134500Z`
- Representative batch download returned HTTP 200 from the Vercel app alias.

## Security Notes

- No raw Vercel, Cloudflare, or Clerk secret values are recorded here.
- `/data/*` and `/downloads/*` remain static public assets if directly requested.
- Full asset protection is a separate future edge/server/domain-access pass.
