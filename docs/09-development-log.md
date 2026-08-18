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

## Phase 2A — Company & User Domain Database Design

- **Status:** Complete
- **Documented:** Approved the `Company`, `User`, and `UserRole` domain design, one-company-per-user MVP relationship, PostgreSQL UUID and timestamp strategies, table names, constraints, indexes, and company data-ownership boundary.
- **Technical decisions:** Kept user email globally unique and defined a trimmed, lowercase stored form to prevent case-variant login identities; indexed `users.companyId`; kept child ownership derivable from parents where safe; prohibited silent cascading company deletion; and deferred exact-one-owner enforcement to backend business logic.
- **Verification:** Reviewed the design against requirements, architecture, roadmap, and security rules; confirmed documentation consistency and verified that no Prisma model, migration, application code, authentication, or dependency change was introduced.
- **Known issues:** None. Deferred decisions are recorded in `docs/04-database-design.md`.
- **Next milestone:** Phase 2B — First Prisma Schema & Migration.

## Phase 2B — First Prisma Schema & Migration

- **Status:** Complete
- **Implemented:** Added only the approved `Company`, `User`, and `UserRole` Prisma definitions and migration `20260818020913_init_company_user`. The migration creates the `companies` and `users` tables, native UUID keys, required company relation, role enum, global unique email index, explicit `companyId` index, approved defaults, and timezone-aware timestamps.
- **Technical decisions:** Used Prisma-generated UUID v4 values with PostgreSQL `uuid` columns, `timestamptz(3)` for UTC-aware timestamps, Prisma `@updatedAt` maintenance, and `ON DELETE RESTRICT` to prevent silent deletion of a company's users. Because the local database role cannot create Prisma's shadow database, generated the SQL with Prisma `migrate diff` and applied the unchanged result with `migrate deploy`; no `db push` or manual SQL correction was used.
- **Verification:** Prisma format, validation, and Client generation passed; the migration applied successfully; PostgreSQL catalog inspection confirmed tables, types, nullability, enum values, defaults, primary and foreign keys, indexes, uniqueness, and deletion behavior; Prisma reported no schema drift; the migration recreated successfully in a temporary isolated schema that was removed afterward; backend typecheck and production build passed; no application records were created.
- **Known issues:** The local PostgreSQL application role cannot create shadow databases, so future `prisma migrate dev` usage requires a dedicated shadow database or an appropriate development-role permission change. This did not block applying or independently recreating the committed migration.
- **Next milestone:** Phase 2C — Registration & Password Security.
