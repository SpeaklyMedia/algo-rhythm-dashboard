# Replit Implementation Guardrails

This project is a static-data React + Vite dashboard handoff. Treat the bundled `public/data/` directory and `public/downloads/` directory as the only runtime inputs.

Read these files before making UI changes:
- `handoff/REPLIT_UI_IMPLEMENTATION_BRIEF.md`
- `handoff/REPLIT_UI_SOURCE_AUTHORITY.md`
- `handoff/REPLIT_UI_DESIGN_TOKENS.json`
- `handoff/REPLIT_UI_LAYOUT_MAP.json`
- `handoff/REPLIT_UI_COMPONENT_SPEC.md`
- `handoff/REPLIT_UI_WIRING_SPEC.md`
- `handoff/REPLIT_UI_PROMPT__REFINED.md`
- `handoff/REPLIT_UI_QA_CHECKLIST.md`

Hard constraints:
- Stay inside this Vite app.
- Use static bundled JSON only.
- Do not add a backend or API proxy.
- Do not change page ids: `overview`, `strategy`, `review`, `package`, `batch`, `handoff`.
- Do not redesign the information architecture.
- Missing required manifests must block the relevant page with a visible error state.
- Missing optional files must render `Unavailable`.
- Preserve the difference between promoted canonical state, latest successful run, review recommendation, latest package, and latest batch.
