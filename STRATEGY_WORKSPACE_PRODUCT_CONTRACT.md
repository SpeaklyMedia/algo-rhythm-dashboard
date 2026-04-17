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

Signed-in users should land on `/workspace`, shown as `Home` in the UI.

The primary workflow is:

1. `/intake` (`Check Idea`): source idea, audience, offer, goal, tone, platform, and constraint inputs.
2. `/drafts` (`Edit Drafts`): per-platform draft cards with editable notes/copy fields and `Copy Draft` buttons.
3. `/calendar` (`Pick Schedule`): manual posting schedule with date, time, platform, status, and notes.
4. `/results` (`Track Results`): manual result logging for impressions, saves, clicks, replies/comments, reposts/shares, conversions, and qualitative notes.
5. `/workspace` (`Download Plan` panel): downloadable JSON and Markdown campaign plans.

`/review` is shown as `Review Approval`. It remains a secondary collaborator
approval and receipt workflow, not the primary signed-in landing experience.

The surface language should stay plain and direct. The app should show the
first-run inline guide, `Your Progress`, purpose blocks, and obvious next/back
buttons so the order of operations is never hidden.

Each main workflow page must explain:

- `What this page is for`
- `What to do here`
- `What happens next`
- `What will not happen`

## Messaging Standard

Primary user-facing copy must be short, direct, and close to a 6th grade
reading level. Prefer sentences that start with `Use this page to...`,
`Next...`, and `This does not...`.

Approved main-flow terms:

- `Home`
- `Check Idea`
- `Edit Drafts`
- `Pick Schedule`
- `Track Results`
- `Download Plan`
- `Draft style`
- `Opening idea`
- `Call to action`
- `Why this draft may work`
- `Notes about what happened`
- `Download JSON Plan`
- `Download Markdown Plan`

Do not use these technical terms in the primary workflow UI unless they are in
hidden data, exported JSON field names, or internal/admin pages:

- `run`
- `cohort`
- `package`
- `batch`
- `SHA`
- `contract`
- `operator`
- `localStorage`
- `artifact`

`/review` and `/admin/*` may show technical terms, but each page must also
include one plain sentence that explains why a normal user can skip it.

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

- `content_object` seeds source idea, audience, goal, call to action, constraints, and target platforms.
- `four_tier_adaptations` seeds platform draft options.
- `experiment_plan` seeds manual test-plan copy.
- `campaign_ledger_seed` provides supporting campaign context.

## Export Contract

Strategy JSON and Markdown exports are downloads only. They are useful
portable files for the creator, team, or reviewer, not server submissions.

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
- Latest production deployment URL:
  `https://algo-rhythm-dashboard-jeai0bxbq-marks-projects-f03fd1cc.vercel.app`
- GitHub Actions Vercel deploy restored: workflow run `24566889412`
- Neurodivergent-friendly onboarding deploy: workflow run `24567687169`
- Messaging cleanup deploy: workflow run `24570177899` for commit `35c101b`
- Signed-out QA receipt:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T14-25-56-492Z/receipt.json`
- Signed-in QA receipt:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T14-31-17-006Z/receipt.json`

Signed-in QA must continue to verify:

- `/sign-in` redirects signed-in users to `/workspace`
- first-run onboarding can be hidden and shown again
- `/workspace`, `/intake`, `/drafts`, `/calendar`, `/results`, and `/review` render across supported viewports
- main navigation uses `Home`, `Check Idea`, `Edit Drafts`, `Pick Schedule`, `Track Results`, and `Review Approval`
- each main workflow route explains `What this page is for`, `What to do here`, `What happens next`, and `What will not happen`
- primary workflow pages do not expose banned technical terms
- guided edits persist after reload through browser storage
- draft copy buttons work
- progress rows update after intake, draft, schedule, and result edits
- strategy JSON includes `schema_version: "strategy_workspace_v1"`
- strategy Markdown includes the campaign plan sections
- reviewer receipt export still works
- admin package/batch/handoff views render and stay out of main navigation
- no write requests are made to the dashboard origin
