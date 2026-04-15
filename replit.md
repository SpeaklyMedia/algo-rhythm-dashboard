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

## Strategy Dashboard Artifact

Located at `artifacts/strategy-dashboard/`. Static-only React + Vite dashboard.

- **Design system**: Dark premium theme — bg `#0b0f14`, accent cyan `#68d6ff`, warm amber `#ffa347`; fonts: Plus Jakarta Sans, League Spartan (display), IBM Plex Mono
- **Pages (6)**: Health Check, Content Strategy, Promotion Review, What's in the Package, Run Collection, Delivery & Downloads
- **Data**: All from `public/data/*.json` — no backend, no live API
- **Shell**: AccountSelector (multi-account shell, "Coming soon" affordance), PipelineStrip numbered breadcrumb, 260px sidebar, active nav left-border accent
- **Human-centric naming**: `PAGE_DISPLAY` map overrides all navigation and header labels
- **Sub-properties**: `property-chip` on platform cards, active property count in status strip and sidebar footer
- **Key files**: `src/App.tsx`, `src/index.css`, `public/data/dashboard_index.json`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
