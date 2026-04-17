# Messaging QA Hardening Notes

## Purpose

This note records the short next-pass list from the messaging cleanup QA sweep.
It is for planning only. Do not store private browser state, raw collaborator
notes, or screenshots with account data here.

## Current Sweep

- Status: pending verification
- Signed-out QA receipt: pending
- Signed-in QA receipt: pending

## Next-Pass Candidates

| Category | Finding | Candidate next action |
| --- | --- | --- |
| `copy_gap` | Review Approval and admin pages still need technical IDs for audit value. | Add a small glossary only if collaborators use those pages without help. |
| `layout_gap` | Pending desktop, tablet, mobile, and narrow-mobile screenshot review after this pass. | Record only concrete overflow or overlap issues found by QA. |
| `workflow_gap` | The app is still browser-only and download-first. | Add stronger recovery guidance if users expect account-saved projects. |
| `qa_gap` | QA checks exact copy and banned terms, but it does not score reading level. | Add a lightweight copy lint or reading-level check if copy churn continues. |
| `future_product_gap` | Real teams will eventually need private saved projects and multi-campaign history. | Plan backend persistence separately; keep it out of this static pass. |

