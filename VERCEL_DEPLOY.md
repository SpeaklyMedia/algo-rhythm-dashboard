# Vercel Deployment Guide

Read `AI_OPERATIONS_INDEX.md` first for the current production target, auth
state, domain state, and safe verification commands.

## What this is
Static-only React + Vite dashboard — no backend, no live API.
All data is bundled from `artifacts/strategy-dashboard/public/data/*.json`.
The Vercel deployment serves only the compiled frontend assets.

---

## Prerequisites

- Vercel account (vercel.com)
- This repository pushed to GitHub (see step 1)

---

## Step 1 — GitHub repository

The project is already pushed to GitHub:
**https://github.com/SpeaklyMedia/algo-rhythm-dashboard**

All 127 source files are present, including `vercel.json`, `pnpm-lock.yaml`,
and the full `artifacts/strategy-dashboard/` tree.

> Note: `.github/workflows/vercel-preview.yml` was not auto-pushed (the API
> blocks `.github/` paths). To add it manually: go to the repo on GitHub →
> **Add file → Create new file** → paste the path `.github/workflows/vercel-preview.yml`
> → paste the contents from the local file.

---

## Step 2 — Import the project into Vercel

1. Go to **vercel.com → New Project**
2. Import the GitHub repository you just pushed
3. Vercel will auto-detect this as a **Vite** project
4. Leave **Root Directory** as the repo root (vercel.json configures everything)
5. Click **Deploy** — Vercel will run the build and deploy automatically

---

## Step 3 — Verify build settings (should be auto-detected)

In Vercel → Project → Settings → Build & Output Settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Other (vercel.json overrides) |
| Build Command | `pnpm --filter @workspace/strategy-dashboard run build` |
| Output Directory | `artifacts/strategy-dashboard/dist` |
| Install Command | `pnpm install --frozen-lockfile` |
| Root Directory | *(repo root)* |

These are configured in `vercel.json` at the repo root — Vercel reads them automatically.

---

## Step 4 — Environment variables

The app is still static, but production now needs one frontend Clerk variable
for the UI login gate:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key for the dedicated Algo-Rhythm Clerk instance |

Do not configure `CLERK_SECRET_KEY` for this static UI-gate pass. The backend
Clerk secret key is not required because this app does not run server-side auth.
Do not reuse ThetaFrame Clerk credentials; sign-in branding should identify
Algo-Rhythm.

The Replit-specific env vars (`PORT`, `BASE_PATH`, `REPL_ID`) are optional in the updated `vite.config.ts` and are simply absent in Vercel, which is fine — the build will use defaults (`BASE_PATH=/`, `PORT=3000`).

---

## Step 5 — Set up GitHub Actions (optional auto-deploy)

To enable auto-deploy on every push to `main`, set these secrets in your GitHub repo:
**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Where to find it |
|--------|-----------------|
| `VERCEL_TOKEN` | Vercel dashboard → Account/Team Settings → Tokens → Create a classic token that can access this project |
| `VERCEL_ORG_ID` | vercel.com → Settings → General → Team ID (or `vercel whoami --json` → `id`) |
| `VERCEL_PROJECT_ID` | vercel.com → Your Project → Settings → General → Project ID |

The workflow file is at `.github/workflows/vercel-preview.yml` — once secrets are set it fires automatically on push to `main`.

### Vercel token runbook

Use a durable Vercel token that has access to the `algo-rhythm-dashboard` project.
Do not use a random saved token from another project just because `vercel whoami`
accepts it. A token can authenticate successfully and still have no access to the
target project/team.

Known failure modes this repo now guards against:

- Wrong token scope: `vercel whoami --token "$TOKEN"` succeeds, but deploy fails
  with `You are not authorized` or `Could not retrieve Project Settings`.
- Newline in GitHub secret: deploy fails with `Must not contain: "\n"`.
- Expiring local OAuth token: a token from the local Vercel CLI auth file may work
  temporarily, but it is not a durable GitHub Actions secret.

Before updating `VERCEL_TOKEN`, validate the candidate locally without printing it:

```bash
TOKEN_FILE=/path/to/local/secret-file
TOKEN="$(awk -F= '/^VERCEL_TOKEN=|^VERCEL_API_KEY=/{sub(/^[^=]*=/,""); print; exit}' "$TOKEN_FILE" | tr -d '\r\n')"

vercel whoami --token "$TOKEN"
VERCEL_ORG_ID=<team-or-user-id> \
VERCEL_PROJECT_ID=<project-id> \
  vercel pull --yes --environment=production --token "$TOKEN"
```

Only set the GitHub secret after both commands succeed:

```bash
printf '%s' "$TOKEN" | gh secret set VERCEL_TOKEN --repo SpeaklyMedia/algo-rhythm-dashboard
```

Use `printf '%s'`, not `printf '%s\n'`, so the encrypted GitHub secret does not
include a trailing newline.

If `vercel pull` fails but `vercel whoami` succeeds, the token is valid for some
Vercel account but not authorized for this project. Create a new classic token
from the Vercel scope that owns `algo-rhythm-dashboard`, then replace the secret.

---

## Build output structure

```
artifacts/strategy-dashboard/dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── data/
│   ├── dashboard_index.json
│   ├── latest_run.json
│   └── ... (all JSON datasets)
└── downloads/
    ├── CANONICAL_POINTER__SSOT_LATEST.txt
    ├── STRATEGY_RUN_PACKAGE__*.zip
    └── STRATEGY_RUN_BATCH__*.zip
```

The `public/data/` and `public/downloads/` directories are automatically copied by Vite during build — no extra configuration needed.

---

## SPA routing

All paths (e.g. `/strategy`, `/review`) are rewritten to `index.html` by the `rewrites` rule in `vercel.json`. React handles client-side routing internally.

---

## What is NOT deployed

- `artifacts/api-server/` — not needed. The dashboard is 100% static JSON.
- `artifacts/mockup-sandbox/` — development tool only.
- `lib/`, `scripts/` — workspace utilities not used at runtime.

---

## Expected production URL

`https://<project-name>.vercel.app` or a custom domain if configured in the Vercel dashboard.
