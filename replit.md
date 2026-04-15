# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Strategy Dashboard Artifact (Algo-Rhythm)

Located at `artifacts/strategy-dashboard/`. Static-only React + Vite dashboard. App title: **Algo-Rhythm**.

- **Design system**: Dark-default + Light mode toggle. Dark: bg `#0c0f18`, accent cyan `#68d6ff`; Light: bg `#f5f7fc`, accent `#0a8fb8`; fonts: Plus Jakarta Sans, League Spartan (display), IBM Plex Mono
- **Logo**: `AlgoRhythmLogo` SVG component (beamed music noteheads + algorithm diamond vertex on beam); inline React JSX, uses `currentColor`
- **Brand**: `BrandHeader` component in sidebar (logo + "Algo-Rhythm" wordmark + context labels); `pipeline-brand` in pipeline bar (icon + wordmark at ≥860px, icon-only at ≤860px)
- **Pages (6)**: Health Check, Content Strategy, Promotion Review, What's in the Package, Run Collection, Delivery & Downloads
- **Data**: All from `public/data/*.json` — no backend, no live API
- **Shell**: BrandHeader in sidebar-top, PipelineBar with pipeline-brand zone, 220px sidebar (off-canvas drawer at ≤860px), active nav left-border accent
- **Responsive**: hamburger+drawer at ≤860px; numbers-only pipeline at ≤780px; full-screen sidebar at ≤640px; short rail labels at ≤640px
- **Theme**: localStorage + prefers-color-scheme; ThemeToggle in pipeline bar; no-flash init in index.html
- **Key files**: `src/App.tsx`, `src/index.css`, `public/data/dashboard_index.json`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
