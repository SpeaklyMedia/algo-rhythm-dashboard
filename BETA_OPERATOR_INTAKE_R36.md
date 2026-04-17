# Algo-Rhythm R36 Operator Intake

## Purpose

Use this note to run the first one-collaborator beta session and triage the
exported strategy workspace files plus any optional reviewer receipts.

## Before The Session

- Confirm the collaborator has Clerk access for `https://algo.mrksylvstr.com`.
- Send `BETA_COLLABORATOR_HANDOFF_R36.md`.
- Remind the collaborator that feedback is exported locally and sent back manually.
- Do not invite collaborator 2 until collaborator 1 completes the session with no unresolved real trigger.

## Operator Script

1. Ask the collaborator to sign in.
2. Ask them to open `Home`.
3. Confirm they can see the strategy workspace.
4. Ask them to review Home, Check Idea, Edit Drafts, Pick Schedule, and Track Results.
5. Ask them to complete useful local edits or confirmations.
6. Ask them to download strategy JSON and Markdown exports.
7. If approval evidence is needed, ask them to complete `/review` and download reviewer JSON and Markdown receipts.
8. Collect the exported files.
9. Triage every issue before considering local repo work.

## Receipt Intake

The expected strategy JSON export has:

- `schema_version: "strategy_workspace_v1"`
- `workspace_id`
- `source_content_id`
- `project`
- `intake`
- `platform_drafts`
- `calendar_items`
- `result_logs`
- `export_status`
- `updated_at`

The optional reviewer JSON receipt has:

- `schema_version: "reviewer_session_v1"`
- `review_context`
- `reviewer`
- `decision`
- `selected_run_id`
- `confidence`
- `checklist`
- `issues`
- `notes`

Reject or request a replacement receipt if:

- The receipt is missing `schema_version`.
- The strategy export is missing intake, platform drafts, calendar, or results fields.
- The optional reviewer receipt is not tied to `multi_run_review`.
- The optional reviewer receipt has no reviewer alias and no useful notes.
- The collaborator reports a problem but does not include an issue row or note.

## Triage Rules

- `usability_feedback`: log for UX/content polish; do not open local technical work by default.
- `content_quality_feedback`: log for strategy/content review; do not open local technical work by default.
- `contract_gap`: reproduce and patch only the missing static contract/data/doc surface.
- `handoff_packet_gap`: patch only the missing handoff/download/instruction surface.
- `operational_regression`: reproduce first, then patch only the broken route, workflow, download, or deployment path.

If an issue is ambiguous, default it to `usability_feedback` unless it names an
exact missing contract field, missing artifact, broken download, failed login,
or broken receipt export.

## Expansion Gate

Invite collaborator 2 only if:

- Collaborator 1 produced strategy JSON and Markdown exports.
- Any requested reviewer approval receipts were also produced.
- No unresolved `contract_gap`, `handoff_packet_gap`, or `operational_regression` remains.
- The operator can explain any usability/content feedback without repo archaeology.

If a real trigger appears, pause cohort expansion and run the smallest
trigger-driven local pass.

Record the sanitized R37 session state in:

- `BETA_COLLABORATOR_SESSION_RECEIPT_R37.md`
- `BETA_COLLABORATOR_SYNTHESIS_R37.md`
- `BETA_COLLABORATOR2_GO_NO_GO_R37.md`

## Signed-In QA Closure

If a local Clerk Playwright storage state exists outside the repo, run:

```sh
DASHBOARD_QA_AUTH_MODE=signed-in \
DASHBOARD_QA_STORAGE_STATE=/path/outside/repo/algo-clerk-storage-state.json \
DASHBOARD_QA_BASE_URL=https://algo.mrksylvstr.com \
pnpm --filter @workspace/scripts run qa:dashboard
```

If no storage state exists, manually verify `/workspace` signed-in behavior
during the first collaborator session and record the exported strategy files as
session evidence.

Never commit Clerk browser storage state, cookies, screenshots containing
account data, or receipt files containing private collaborator identity.
