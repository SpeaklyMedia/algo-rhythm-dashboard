# Algo-Rhythm R36 Collaborator Beta Handoff

## Purpose

This handoff is for the first supervised collaborator beta session.

You are reviewing the live Algo-Rhythm strategy workspace and exporting a
local campaign plan for the operator. You are not generating new runs,
connecting social accounts, auto-posting, or submitting feedback to a server.

## Access

- Live app: `https://algo.mrksylvstr.com`
- Login: use the Clerk sign-in flow provided by the operator.
- After login, open `Home` or go directly to `https://algo.mrksylvstr.com/workspace`.

If you cannot sign in, stop and report `access_blocked` to the operator. Do not
try to bypass the Clerk gate.

## What To Review

Use the workspace pages in this order:

1. `Home`: read the 5-step guide and check `Your Progress`.
2. `Check Idea`: confirm or edit the source idea, audience, offer, goal, tone, platforms, and constraints.
3. `Edit Drafts`: inspect platform drafts, tune any draft notes/copy that would make the plan usable, and test `Copy Draft`.
4. `Pick Schedule`: add or adjust at least one manual schedule item.
5. `Track Results`: add manual result notes or sample expected outcomes if nothing has been posted yet.
6. `Review Approval`: complete the secondary approval receipt only if the operator asks for approval evidence.

Expected current state:

- Review mode: `multi_run_review`
- Cohort size: `4`
- Recommended run: `20260414T232200Z`
- Included runs:
  - `20260414T232200Z`
  - `20260414T232000Z`
  - `20260414T232500Z`
  - `20260416T124500Z`

## Strategy Workspace Task

The primary task is to produce usable strategy exports:

1. Confirm or edit the workspace intake fields.
2. Inspect the platform drafts and tune notes/copy where needed.
3. Add at least one calendar item or schedule note.
4. Add a result note, expected metric, or manual logging reminder.
5. Acknowledge the local export status.
6. Download both strategy exports:
   - strategy JSON
   - strategy Markdown
7. Send both downloaded strategy files back to the operator.

If the operator asks for a reviewer approval receipt, complete the `Review Approval`
page:

1. Enter a reviewer alias.
2. Choose a decision:
   - `accept_recommended`
   - `accept_with_notes`
   - `reject_recommendation`
   - `needs_operator_review`
3. Choose the selected run.
4. Set confidence: `low`, `medium`, or `high`.
5. Complete the reviewer checklist.
6. Add issues only when there is something specific to record.
7. Add notes describing what was clear and what required operator explanation.
8. Download both receipts:
   - `Download JSON receipt`
   - `Download Markdown summary`
9. Send both downloaded reviewer files back to the operator.

The app saves browser-local drafts while you work. It does not submit anything
automatically and does not store work in a cloud workspace.

## Issue Categories

Use these categories exactly:

- `usability_feedback`: UI, wording, flow, or comprehension feedback.
- `content_quality_feedback`: strategy quality, evidence quality, or output usefulness feedback.
- `contract_gap`: the static dashboard contract is missing or internally inconsistent.
- `handoff_packet_gap`: required handoff/download material is missing or unusable.
- `operational_regression`: something previously working is broken, such as login, route load, download, or receipt export.

If unsure, choose `usability_feedback` and explain the ambiguity in notes.

## Success Criteria

The session is successful if you can:

- Explain the source idea, audience, offer, goal, and recommended angle.
- Produce useful platform draft notes or copy for the target platforms.
- Add a manual posting schedule item.
- Add manual result notes or logging expectations.
- Export both strategy JSON and Markdown files.
- Complete the optional reviewer receipt only if approval evidence is requested.

## Known Limitations

- The dashboard is a static published snapshot, not a live generator.
- The app stores editable work in browser `localStorage` and local downloads only.
- The app does not submit feedback, strategy edits, or result logs to a server.
- The app does not autonomously promote a run or publish social posts.
- The app does not connect social accounts or automate outreach.
- The app does not trigger refresh, package, batch, or deploy actions.
- Clerk protects the UI only; direct `/data/*` and `/downloads/*` URLs remain public if known.
- Strategy exports and optional reviewer receipt files must be sent back to the operator manually.
- Package, batch, and handoff pages are internal/admin context unless the operator specifically asks you to inspect them.
