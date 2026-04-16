# Closed Lane Delivery Receipt

## Decision

`GO_FOR_LOCKED_INTERNAL_CLOSED_LANE_WITH_PRODUCTION_CLERK_PENDING_SIGNED_IN_STATE_REFRESH`

Lane B Algo-Rhythm is delivered as a locked internal closed lane on the current
working production app. The dedicated Algo Clerk production DNS and TLS gates
are complete, and Vercel has been switched to the dedicated production
publishable key. Signed-in Playwright automation now requires a fresh private
Clerk storage-state recording for the production instance.

## Delivery Target

- Production URL: `https://algo.mrksylvstr.com`
- Delivery candidate commit: `bae3f81357a98b2b1b2225807b03695a98f69413`
- Delivery candidate short SHA: `bae3f81`
- GitHub Actions workflow: `Deploy to Vercel`
- Verified workflow run: `24537603683`
- Verified workflow status: `completed / success`
- Production redeploy: `dpl_FaYxg6h2z8GpGw65Pgu68A1aT9RR`
- Primary user workflow: signed-in `/review` reviewer workspace

## Static Contract

Production contract check returned:

```text
multi_run_review 4 20260414T232200Z
```

Expected contract:

- `review_mode.review_mode`: `multi_run_review`
- `review_mode.cohort_size`: `4`
- `review_mode.recommended_run_id`: `20260414T232200Z`

## QA Evidence

Static and build gates passed:

- `pnpm install --frozen-lockfile`
- `pnpm --filter @workspace/strategy-dashboard run typecheck`
- `pnpm --filter @workspace/strategy-dashboard run build`
- `pnpm --filter @workspace/scripts run typecheck`

Production browser QA passed:

- Signed-out receipt after production Clerk switch: `test-results/algo-rhythm-dashboard-browser-qa/2026-04-16T22-43-36-146Z/receipt.json`
- Signed-in receipt before production Clerk switch: `scripts/test-results/algo-rhythm-dashboard-browser-qa/2026-04-16T19-56-48-850Z/receipt.json`
- Signed-in receipt after production Clerk switch: pending fresh private Clerk Playwright storage-state recording

The browser QA covered all six routes:

- `/`
- `/strategy`
- `/review`
- `/package`
- `/batch`
- `/handoff`

The pre-switch signed-in QA used the private Playwright Clerk storage state
outside the repo and verified the reviewer workspace receipt workflow. After the
production Clerk key switch, the old storage state is intentionally invalid for
automation and must be refreshed by running the headed Clerk recorder. The
storage-state contents are not recorded here.

## Auth And Domain State

Vercel has `VITE_CLERK_PUBLISHABLE_KEY` configured for Production with the
dedicated Algo Clerk production publishable key. The value is not recorded here.

Algo-Rhythm Clerk production CNAMEs resolve publicly:

```text
clerk.algo.mrksylvstr.com -> frontend-api.clerk.services
accounts.algo.mrksylvstr.com -> accounts.clerk.services
clkmail.algo.mrksylvstr.com -> mail.qr0siahe8a42.clerk.services
clk._domainkey.algo.mrksylvstr.com -> dkim1.qr0siahe8a42.clerk.services
clk2._domainkey.algo.mrksylvstr.com -> dkim2.qr0siahe8a42.clerk.services
```

Completed on 2026-04-16:

- Clerk DNS records resolve publicly.
- Clerk TLS succeeds for `clerk.algo.mrksylvstr.com`.
- Clerk TLS succeeds for `accounts.algo.mrksylvstr.com`.
- Vercel Production `VITE_CLERK_PUBLISHABLE_KEY` was switched from the previous
  working test key to the dedicated Algo production key.
- Production redeploy completed and aliased to `https://algo.mrksylvstr.com`.

Remaining operator action:

- Re-record the private Playwright Clerk storage state for the dedicated
  production Clerk instance, then rerun signed-in QA.

## Security And Scope

Tracked-file secret scan passed for Clerk, Cloudflare, and Vercel secret
patterns. No raw secret values, browser storage state, auth screenshots, private
collaborator data, or raw reviewer receipts are committed in this receipt.

Closed-lane scope remains frozen:

- no new product work
- no route or page-id changes
- no backend or runtime API
- no dashboard contract redesign
- no data/model changes

## Expansion Rule

Collaborator 2 remains blocked unless the existing go/no-go criteria in
`BETA_COLLABORATOR2_GO_NO_GO_R37.md` pass with no unresolved:

- `contract_gap`
- `handoff_packet_gap`
- `operational_regression`
