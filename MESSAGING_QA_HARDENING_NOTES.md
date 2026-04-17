# Messaging QA Hardening Notes

## Purpose

This note records the short next-pass list from the messaging cleanup QA sweep.
It is for planning only. Do not store private browser state, raw collaborator
notes, or screenshots with account data here.

## Current Sweep

- Status: passed on production
- Deploy: GitHub Actions run `24570177899` for commit `35c101b`
- Signed-out QA receipt:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T14-25-56-492Z/receipt.json`
- Signed-in QA receipt:
  `test-results/algo-rhythm-dashboard-browser-qa/2026-04-17T14-31-17-006Z/receipt.json`

## Next-Pass Candidates

| Category | Finding | Candidate next action |
| --- | --- | --- |
| `copy_gap` | Review Approval and admin pages still need technical IDs for audit value. | Add a small glossary only if collaborators use those pages without help. |
| `layout_gap` | Browser QA found no document-level horizontal overflow across desktop, tablet, mobile, and narrow-mobile. Manual screenshot review can still catch visual polish issues. | Review screenshots before the next design pass and record only concrete overlap issues. |
| `workflow_gap` | The app is still browser-only and download-first. | Add stronger recovery guidance if users expect account-saved projects. |
| `qa_gap` | QA checks exact copy and banned terms, but it does not score reading level. | Add a lightweight copy lint or reading-level check if copy churn continues. |
| `future_product_gap` | Real teams will eventually need private saved projects and multi-campaign history. | Plan backend persistence separately; keep it out of this static pass. |
