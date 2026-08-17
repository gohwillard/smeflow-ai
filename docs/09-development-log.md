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
