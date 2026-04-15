# Strategy Dashboard Replit Scaffold

This app is a separate Lane B dashboard scaffold. It reads only from static files under `public/data/` and `public/downloads/`.

Read `replit.md` first when importing this into Replit. The `handoff/` directory contains the decision-complete UX/UI brief, token map, layout map, component spec, wiring rules, refined Replit prompt, and QA checklist.

## Commands

- Install: `npm install`
- Dev: `npm run dev -- --host 0.0.0.0 --port 3000`
- Build: `npm run build`
- Preview: `npm run preview -- --host 0.0.0.0 --port 3000`

## Data flow

- Refresh the seeded bundle with:
  - `python3 tools/sync_dashboard_data.py`
- Package the self-contained Replit handoff zip with:
  - `python3 tools/package_replit_handoff.py`
- The dashboard expects `public/data/dashboard_index.json` to exist.
- Missing required datasets block the UI with a visible error panel.
- Missing optional datasets render as `Unavailable`.

## Replit notes

- The included `.replit` and `replit.nix` files target a runnable engineering scaffold, not a production deployment.
- No backend is required for v1; the dashboard is static-data only.
- Do not add a backend, change route names, or replace the static contract model in this pass.
