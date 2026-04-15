# Replit UI Implementation Brief

## Objective
Deliver a static-data Lane B review dashboard in Replit without changing the underlying strategy-generation, review, package, or batch semantics. This app is an internal operator and strategy-review surface, not a public marketing site and not a replacement for the operator console.

## What To Build
- Use the existing React + Vite app only.
- Keep the six fixed pages: `Overview`, `Strategy`, `Review`, `Package`, `Batch`, `Handoff`.
- Render everything from bundled `public/data/*.json` and `public/downloads/*`.
- Preserve the current distinction between:
  - promoted canonical alias
  - latest successful run
  - review recommendation
  - latest package
  - latest batch

## Design Direction
- Base shell and navigation mood: Modal-Nodal
- Information hierarchy and status semantics: ThetaFrame
- Modular roadmap and function-card layout: Yuki
- Local-first operational tone: Flipper local scaffold

## Non-Goals
- No backend
- No live API fetches outside bundled static files
- No operator-console redesign
- No route renames
- No data-model invention beyond the existing dashboard index and bundled manifests

## Acceptance
- `npm install`, `npm run dev`, and `npm run build` all pass
- All six pages render from bundled static data only
- Missing required manifests block the page with an error state
- Missing optional files render `Unavailable`
- The UI feels like one coherent system instead of four unrelated references pasted together
