# Replit UI QA Checklist

## Runtime
- `npm install` passes
- `npm run dev -- --host 0.0.0.0 --port 3000` starts cleanly
- `npm run build` passes

## Contract
- `dashboard_index.json` loads
- every required dataset declared in the index resolves
- optional dataset failures do not break the app

## UX behavior
- All six pages render from static data only
- promoted/latest/reviewed/package/batch states are visually distinct
- hashes, IDs, and file names remain readable
- missing required manifests produce a blocking error panel
- missing optional artifacts show `Unavailable`

## Replit handoff readiness
- `.replit`, `replit.nix`, `replit.md`, and `README.md` are present
- `handoff/` contains the implementation brief, source authority, token map, layout map, component spec, wiring spec, refined prompt, and QA checklist
- no `node_modules`, `dist`, `__pycache__`, or `.pyc` files are included in the packaged handoff zip
