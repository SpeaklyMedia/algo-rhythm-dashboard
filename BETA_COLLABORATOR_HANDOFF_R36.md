# Algo-Rhythm R36 Collaborator Beta Handoff

## Purpose

This handoff is for the first supervised collaborator beta session.

You are reviewing the live Lane B `multi_run_review` dashboard and exporting a
reviewer receipt for the operator. You are not generating new runs or submitting
feedback to a server.

## Access

- Live app: `https://algo.mrksylvstr.com`
- Login: use the Clerk sign-in flow provided by the operator.
- After login, open the `Review` page or go directly to `https://algo.mrksylvstr.com/review`.

If you cannot sign in, stop and report `access_blocked` to the operator. Do not
try to bypass the Clerk gate.

## What To Review

Use the dashboard pages in this order:

1. `Overview`: confirm you understand promoted alias, latest run, recommendation, package, and batch state.
2. `Review`: inspect the recommended run, ranked cohort, excluded runs, and reviewer workspace.
3. `Package`: verify the package meaning and package integrity fields are understandable.
4. `Batch`: verify the batch represents the reviewed cohort and included runs.
5. `Handoff`: verify downloads and static contract metadata are understandable.

Expected current state:

- Review mode: `multi_run_review`
- Cohort size: `4`
- Recommended run: `20260414T232200Z`
- Included runs:
  - `20260414T232200Z`
  - `20260414T232000Z`
  - `20260414T232500Z`
  - `20260416T124500Z`

## Reviewer Workspace Task

On the `Review` page:

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
9. Send both downloaded files back to the operator.

The app saves a browser-local draft while you work. It does not submit anything
automatically.

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

- Explain what the recommended run is and why it is recommended.
- Explain the difference between promoted/latest/recommended/package/batch.
- Open or understand the package and batch download surfaces.
- Complete the reviewer workspace without repo archaeology.
- Export both JSON and Markdown receipts.

## Known Limitations

- The dashboard is a static published snapshot, not a live generator.
- The app does not submit feedback to a server.
- The app does not autonomously promote a run.
- The app does not trigger refresh, package, batch, or deploy actions.
- Clerk protects the UI only; direct `/data/*` and `/downloads/*` URLs remain public if known.
- Receipt files are local exports and must be sent back to the operator manually.

