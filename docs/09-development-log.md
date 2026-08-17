# Development Log

## Phase 1A — Express + TypeScript Backend

- **Status:** Complete
- **Implemented:** Express API foundation in `apps/api`, JSON parsing, environment-based CORS, `GET /api/v1/health`, strict TypeScript configuration and development/build scripts.
- **Technical decisions:** Kept application configuration separate from server startup, used NodeNext modules, and deferred Zod until an endpoint requires input validation.
- **Verification:** Typecheck and production build passed; `npm run dev:api` started successfully; the health endpoint returned the expected JSON response.
- **Known issues:** None.
- **Next milestone:** Phase 1B — React ↔ Express Connection.

## Phase 1B — React ↔ Express Connection

- **Status:** Complete
- **Implemented:** Added a typed native `fetch` health client, environment-based API URL configuration, and a responsive foundation screen with checking, online and offline states.
- **Technical decisions:** Centralized frontend API access under `src/api`, validated the health response at runtime, and added no new dependencies.
- **Verification:** Frontend build and lint passed; backend typecheck and build passed; Vite injected the configured API URL; the live endpoint returned HTTP 200, the expected JSON, and the configured CORS header.
- **Known issues:** None.
- **Next milestone:** PostgreSQL + Prisma foundation.

## Phase 1C — PostgreSQL + Prisma Database Foundation

- **Status:** Complete
- **Implemented:** Connected the Express API to local PostgreSQL through Prisma ORM, added Prisma CLI configuration and an intentionally model-free schema, generated Prisma Client to an explicit output path, created one reusable database client, and extended `GET /api/v1/health` with a safe database connectivity check.
- **Technical decisions:** Used the Prisma 7 `prisma-client` generator and `@prisma/adapter-pg` driver adapter, kept `DATABASE_URL` in local environment configuration, ignored generated client code and regenerated it during builds, and deferred models and migrations until the domain schema is agreed.
- **Versions:** PostgreSQL 18.6; Prisma CLI, Prisma Client and PostgreSQL adapter 7.9.1; `pg` 8.23.0.
- **Verification:** Prisma validation and client generation passed; backend typecheck and production build passed; a live `SELECT 1` health check returned HTTP 200 with `database: "connected"`; an isolated unreachable-connection test returned HTTP 503 with `database: "disconnected"` and no sensitive details.
- **Known issues:** None.
- **Next milestone:** Phase 1D — Full-stack Foundation Verification.

## Phase 1D — Full-stack Foundation Verification

- **Status:** Complete
- **Verification performed:** Audited the monorepo structure, Node.js version, workspace scripts, Prisma configuration, environment examples, ignore rules, frontend API configuration, backend environment handling, CORS behavior, health endpoint success and failure responses, and the complete browser-to-database flow.
- **Checks executed:** Clean `npm ci`; frontend lint and production build; backend typecheck and production build; Prisma schema validation and client generation; live HTTP 200 database-connected health check; CORS header check; isolated HTTP 503 database-disconnected check; tracked-file and ignore-rule hygiene checks; and a headless-browser confirmation that the React application displayed `API Online`.
- **Important fixes:** None required. The application foundation was already internally consistent; only milestone documentation and local startup instructions were updated.
- **Final Phase 1 architecture:** React + TypeScript + Vite → Express + TypeScript → Prisma ORM 7 → PostgreSQL 18.6.
- **Known issues:** None.
- **Next milestone:** Phase 2A — Company & User Domain Database Design.

## Roadmap Normalization After Phase 1

- **Status:** Complete
- **Documentation updated:** Refined the project roadmap into the canonical development sequence, fixed the top-level Phase 0–10 numbering, and added small, reviewable sub-milestones under every phase.
- **Technical decisions:** Preserved Phase 1 as infrastructure-only and moved the first meaningful Prisma migration to Phase 2B, after the Company and User domain is designed and reviewed in Phase 2A. No placeholder migration is required.
- **Governance:** Updated `AGENTS.md` to require roadmap-first milestone selection, ordered delivery, relevant verification before completion, and synchronized status documentation.
- **Verification:** Checked the roadmap's phase numbering, milestone coverage, current statuses, historical Phase 1 implementation, and consistency across the roadmap, README, `AGENTS.md`, and this development log.
- **Application changes:** None. No application code, Prisma models, migrations, or dependencies were changed.
- **Known issues:** None.
- **Next milestone:** Phase 2A — Company & User Domain Database Design.
