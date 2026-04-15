# Replit UI Component Spec

## Shell
- `Sidebar rail`: brand block, pill status row, fixed page navigation, design-authority summary, contract meta
- `Status strip`: promoted alias, latest success, review recommendation, latest package
- `Page header`: eyebrow, display heading, one-paragraph page lead, state badges

## Shared components
- `StatusBadge`
  - semantic chip for promoted, manual-only, pass, optional-gaps, and similar state labels
- `MetricCard`
  - compact summary card with label, main value, and optional detail line
- `KeyValueTable`
  - structured fact surface for hashes, IDs, paths, and compact metadata
- `SurfaceCard`
  - modular grouped card for selected platforms, design authority, selected signal cards, packet contents
- `EmptyState`
  - optional-missing state; must say `Unavailable` or equivalent
- `ErrorPanel`
  - blocking state for required missing data; must be visually stronger than empty states

## Tables
- Keep review ranking, handoff artifacts, and batch package tables scrollable instead of collapsing them into cramped mobile cards.
- Show hashes in monospace and allow wrap.

## UX rules
- Promoted canonical state must look more locked than latest/recommended state.
- Optional gaps may warn but must not block the whole app.
- The Handoff page is part of the product shell, not a raw debug page.
