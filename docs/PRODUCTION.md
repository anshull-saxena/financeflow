# Production readiness notes (static site)

This repository currently serves a **static UI demo** via `vercel.json` rewrites to `site/public`.

## What’s production-ready now

- Vercel security headers + CSP are configured in `vercel.json`.
- Modal utilities (`site/public/shared_modals.js`) are defensive against early calls (before `DOMContentLoaded`).
- Demo authentication flows no longer ship hardcoded credentials in the login page.
- User identity keys are consistent (`ff_userName`, `ff_userEmail`) with automatic migration from legacy `ff_email`.
- A MySQL schema + migration/seed tooling exists under `server/` (API integration is intentionally deferred).

## What’s still demo-only (needs real backend)

- Authentication, authorization, session management, password storage/reset.
- Server-side validation and persistence in the UI (transactions/goals are still stored in `localStorage` until an API is added).
- Audit logging, rate limiting, and abuse protection.

## MySQL (ready for prod, API later)

- Local MySQL (no Docker): see `docs/MYSQL_SETUP.md`
- Optional Docker Compose (if you want it): `config/docker-compose.mysql.yml`
- Schema migrations: `server/migrations/*.sql` (applied via `server/src/db/migrate.ts`)
- Seed data: `server/src/scripts/seed.ts`

**Run locally (no Docker)**: `docs/MYSQL_SETUP.md`

## Recommended next steps

1. Replace Tailwind CDN usage with a build pipeline (Tailwind CLI/Vite) and remove inline scripts/styles to tighten CSP (drop `'unsafe-inline'`).
2. Add a real API for auth + data persistence (e.g., Next.js/Express + database) and migrate the UI to call it.
3. Add automated checks (lint, tests, CI) once a Node project structure is in place.
