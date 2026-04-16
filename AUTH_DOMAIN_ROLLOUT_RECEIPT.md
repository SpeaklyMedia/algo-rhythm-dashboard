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
- Signed-out browser QA: pending verification
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

## Security Notes

- No raw Vercel, Cloudflare, or Clerk secret values are recorded here.
- `/data/*` and `/downloads/*` remain static public assets if directly requested.
- Full asset protection is a separate future edge/server/domain-access pass.
