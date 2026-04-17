# Algo-Rhythm Strategy Workspace Product Contract

## Purpose

Algo-Rhythm is currently a signed-in, local-export-first social strategy
workspace. It helps a creator, solo marketer, or small team turn one source idea
into a practical posting plan using the static strategy artifacts already
bundled with the app.

The app remains static-only. It does not persist user work to a server, connect
social accounts, auto-post, scrape, automate outreach, bulk-message, or target
users.

## Primary User Workflow

Signed-in users should land on `/workspace`.

The primary workflow is:

1. `/workspace`: campaign summary, next actions, platform selection, export status, and continue point.
2. `/intake`: editable source idea, audience, offer, goal, tone, platform, and constraint inputs.
3. `/drafts`: per-platform draft cards seeded from bundled strategy adaptations, with editable notes/copy fields and copy buttons.
4. `/calendar`: manual posting schedule with date, time, platform, status, and notes.
5. `/results`: manual result logging for impressions, saves, clicks, replies/comments, reposts/shares, conversions, and qualitative notes.
6. Local strategy export: downloadable JSON and Markdown campaign plans.

`/review` remains a secondary collaborator approval and receipt workflow. It is
not the primary signed-in landing experience.

## Internal Routes

Internal trust and audit surfaces live under:

- `/admin/package`
- `/admin/batch`
- `/admin/handoff`

The legacy routes `/package`, `/batch`, and `/handoff` remain available for QA
and older handoff compatibility, but they should not appear in the main user
navigation.

## Local Data Model

The browser-local workspace draft is scoped by the current static source content
ID.

Storage key shape:

```text
algo-rhythm:strategy-workspace:v1:<source_content_id>
```

The exported JSON schema is:

```text
strategy_workspace_v1
```

The workspace draft includes:

- `workspace_id`
- `source_content_id`
- `project`
- `intake`
- `platform_drafts`
- `calendar_items`
- `result_logs`
- `export_status`
- `updated_at`

Defaults are deterministic and come from bundled static data:

- `content_object` seeds source idea, audience, operator goal, CTA, constraints, and target platforms.
- `four_tier_adaptations` seeds platform draft options.
- `experiment_plan` seeds manual test-plan copy.
- `campaign_ledger_seed` provides supporting campaign context.

## Export Contract

Strategy JSON and Markdown exports are local downloads only. They are useful
portable artifacts for the operator or creator, not server submissions.

The Markdown export should remain readable as a campaign plan and include:

- source idea
- audience and goal
- recommended angle
- platform drafts
- calendar/schedule
- experiment plan
- results notes

The reviewer receipt export stays separate and keeps:

```text
reviewer_session_v1
```

Do not merge strategy workspace exports and reviewer receipts into one format
without an explicit contract update.

## Auth And Asset Boundary

Authentication is a Clerk UI gate using the dedicated Algo-Rhythm Clerk
instance through Vercel `VITE_CLERK_PUBLISHABLE_KEY`.

The app must not add:

- direct Google OAuth endpoints
- backend OAuth callback handlers
- `CLERK_SECRET_KEY`
- databases
- private APIs
- social network integrations

Direct `/data/*` and `/downloads/*` assets remain public static files if their
URLs are known. Do not describe bundled static data as private customer storage.

## QA Baseline

Current production target:

- Live app: `https://algo.mrksylvstr.com`
- Strategy workspace deployment: `dpl_8oHfSXr1oNWnYFy3zUVzKPCTVLiF`
- GitHub Actions Vercel deploy restored: workflow run `24566889412`
- Signed-out QA receipt:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T13-05-00-123Z/receipt.json`
- Signed-in QA receipt:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T13-08-14-847Z/receipt.json`

Signed-in QA must continue to verify:

- `/sign-in` redirects signed-in users to `/workspace`
- `/workspace`, `/intake`, `/drafts`, `/calendar`, `/results`, and `/review` render across supported viewports
- guided edits persist after reload through `localStorage`
- draft copy buttons work
- strategy JSON includes `schema_version: "strategy_workspace_v1"`
- strategy Markdown includes the campaign plan sections
- reviewer receipt export still works
- admin package/batch/handoff views render and stay out of main navigation
- no write requests are made to the dashboard origin
