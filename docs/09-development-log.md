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

## Phase 2C — Registration & Password Security

- **Status:** Complete
- **Implemented:** Added `POST /api/v1/auth/register` using a route/controller/service structure, strict Zod request validation, canonical lowercase email storage, a reusable asynchronous scrypt hashing utility, atomic nested creation of a Company and its first `OWNER`, safe success/error responses, duplicate-email conflict handling, and focused Vitest/Supertest coverage.
- **Technical decisions:** Treated passwords as opaque 15–128-character values without trimming or composition rules; used Node.js 22 scrypt with `N=16384`, `r=8`, `p=1`, a random 16-byte salt, a 64-byte derived key, and a versioned self-describing stored format; relied on the database unique constraint as the duplicate-email source of truth; and used Prisma nested relational creation instead of a more complex interactive transaction. Added Zod as the required runtime validator and Vitest, Supertest, and Supertest types as development-only test dependencies.
- **Verification:** Prisma validation and Client generation passed; backend typecheck and production build passed; all 8 automated tests passed; manual HTTP and database verification confirmed HTTP 201, normalized email, OWNER assignment, active default, hashed storage, safe response fields, HTTP 409 for a duplicate, atomic rollback of the duplicate company, and foreign-key-safe cleanup. Repository diff, secret, migration, and scope checks were also performed.
- **Known issues:** No Phase 2C functional issue was found, and no Prisma schema or migration change was required. The existing development-tool dependency tree still produces three high-severity `npm audit` findings through Prisma CLI's `@prisma/config` dependency on `deepmerge-ts`; npm currently proposes a breaking Prisma downgrade, so no forced audit fix was applied in this milestone.
- **Next milestone:** Phase 2D — Login & JWT Authentication.

## Phase 2D — Login & JWT Authentication

- **Status:** Complete
- **Implemented:** Added `POST /api/v1/auth/login` to the existing route/controller/service module, strict Zod login validation and canonical email lookup, reusable asynchronous scrypt password verification, safe invalid-credential and inactive-account responses, isolated JWT configuration/signing utilities, HS256 access tokens, safe user responses, and focused Vitest/Supertest coverage.
- **Technical decisions:** Kept passwords opaque and required only a non-empty string during login so historical credentials are not judged by the registration minimum; defensively parsed and bounded the stored scrypt version, parameters, salt, and derived key before using a length check and `timingSafeEqual`; selected maintained `jose` 6.2.9 as the only new production dependency; required a minimum 32-byte environment secret; pinned HS256; and limited token claims to `sub`, `companyId`, `role`, `iat`, `exp`, `iss`, and `aud` with a configured 30-minute lifetime.
- **Verification:** Prisma validation and Client generation, backend typecheck and production build, all 21 authentication tests, and live HTTP verification passed. Manual checks confirmed HTTP 200 and safe token/user output, identical HTTP 401 responses for unknown email and wrong password, HTTP 403 without a token for an inactive user, and cleanup of the fictional records. Diff, secret, migration, and milestone-scope reviews found no Phase 2E or later work.
- **Known issues:** No Phase 2D functional issue was found, and no schema or migration change was required. `npm audit` remains unchanged at three high-severity development-tool findings through Prisma CLI's `@prisma/config` dependency on `deepmerge-ts`; `jose` added no finding, and no breaking Prisma downgrade was forced.
- **Next milestone:** Phase 2E — Authentication Middleware & Company Isolation.

## Phase 2E — Authentication Middleware & Company Isolation

- **Status:** Complete
- **Implemented:** Added reusable Bearer authentication middleware, defensive access-token claim validation, current-User database revalidation, a typed `{ userId, companyId, role }` request context, and protected `GET /api/v1/auth/me` with safe current-user output.
- **Technical decisions:** Reused Phase 2D's `jose` and JWT configuration; pinned verification to HS256 with configured issuer and audience; required and type-checked `sub`, `companyId`, `role`, `iss`, `aud`, `iat`, and `exp`; selected only authentication-safe User fields; rejected deleted Users and token/database company or role mismatches with safe HTTP 401 responses; preserved HTTP 403 `ACCOUNT_INACTIVE`; and established `req.auth.companyId` as the authoritative scope instead of request input. No role-permission matrix or speculative abstraction was added.
- **Verification:** Prisma validation and Client generation, backend typecheck and production build, all 41 registration/login/middleware tests, and live HTTP verification passed. Manual checks confirmed registration 201, login 200, authenticated `/me` 200 with matching identity and no password material, missing and tampered tokens 401, and an unexpired token 403 after database deactivation. Temporary fictional records were cleaned up. Diff, secret, migration, and scope reviews found no schema, frontend authentication, or later-module changes.
- **Known issues:** None. No dependency, Prisma schema, or migration change was required. The previously documented Prisma development-tool audit findings remain outside this milestone and unchanged.
- **Next milestone:** Phase 2F — Company Profile.

## Phase 2F — Company Profile

- **Status:** Complete
- **Implemented:** Added authenticated `GET` and `PATCH /api/v1/company/profile` endpoints in a focused Company module, safe profile-only Prisma selections and responses, strict Zod PATCH validation, explicit null-clearing for optional profile fields, safe missing-Company handling, and a small role guard that keeps `STAFF` read-only while allowing `OWNER` and `ADMIN` updates.
- **Technical decisions:** Used only the current database-validated `req.auth.companyId` for reads and writes; exposed no Company ID request parameter; kept PATCH truly partial by preserving omitted fields; trimmed all supplied strings; rejected blank strings, unknown fields, immutable fields, and null Company names; normalized the non-unique business contact email to lowercase; and deferred the profile UI to Phase 2G with the protected frontend authentication flow.
- **Verification:** Prisma validation and Client generation, backend typecheck and production build, all 66 API integration/regression tests, and live HTTP verification passed. Automated tests cover all read roles, OWNER/ADMIN writes, STAFF HTTP 403, authentication, strict validation, trimming, email normalization, null clearing, immutable fields, safe response selection, and two-company isolation. Live checks confirmed registration/login, GET, persisted PATCH, forbidden `companyId` rejection, STAFF denial, and cleanup of all fictional records. Diff, secret, migration, and milestone-scope reviews found no dependency, schema, migration, frontend authentication, or later-module changes.
- **Known issues:** None. The previously documented Prisma development-tool audit findings remain outside this milestone and unchanged.
- **Next milestone:** Phase 2G — Protected Frontend Authentication Flow.

## Phase 2G — Protected Frontend Authentication Flow

- **Status:** Complete
- **Implemented:** Added declarative `/register`, `/login`, `/app`, and `/company` SPA routes; typed memory-only authentication state; registration and login forms with accessible password visibility controls; `/auth/me` confirmation after login; reusable public/protected route guards; a minimal authenticated home; role-aware Company Profile viewing and editing; local logout; centralized Bearer requests; consistent backend JSON error handling; loading/error states; and responsive foundation styling. Authenticated in-SPA navigation to `/login` or `/register` returns to `/app`.
- **Technical decisions:** Used React Context rather than a global state library, native `fetch` rather than Axios, inline SVG password icons rather than an icon dependency, and the existing backend contracts unchanged. The access token exists only in React memory and is never written to Web Storage, IndexedDB, cookies, or URLs. A refresh or address-bar navigation reloads the SPA and intentionally requires login again. `OWNER` and `ADMIN` can edit only the five backend-approved Company fields; `STAFF` remains read-only. Profile edits use controlled draft state, frontend validation, normalized diff-only PATCH payloads, empty-to-null optional fields, and the backend response as saved state. HTTP 401 clears the local session; HTTP 403 leaves the user and edit state intact. Backend authorization remains authoritative.
- **Dependencies:** Added React Router 8.3.0 as the single production dependency for current declarative Vite SPA routing. Added Vitest 4.1.10, React Testing Library 16.3.2, and jsdom 30.0.1 as development-only dependencies for focused browser-component and routing tests. No Axios, global-state library, UI framework, cookie/session package, or backend dependency was added.
- **Verification:** All 24 frontend tests passed, covering the public/protected route matrix, authenticated SPA redirects, remount/refresh memory loss, registration/login, both password toggles, OWNER/ADMIN edit access, STAFF read-only behavior, populated edit state, diff-only PATCH security, backend-response updates, Cancel, null clearing, validation, 401 clearing, 403 preservation, and empty Web Storage. Frontend lint and production build passed. Live headless-Chrome verification covered both password toggles, authenticated SPA redirects, refresh-to-login, OWNER edit/save/cancel/null-clearing, STAFF read-only behavior, empty `localStorage`/`sessionStorage`, and visual inspection; fictional records were removed. Existing backend regressions had already passed for Phase 2G and were not rerun because no backend file changed during this frontend-only polish.
- **Known issues:** Refreshing intentionally ends the current frontend session because persistent authentication and HttpOnly-cookie session design are deferred. No backend contract, Prisma schema, or migration changed.
- **Next milestone:** Phase 2H — Phase 2 Verification.

## Phase 2H — Phase 2 Verification

- **Status:** Complete. Phase 2 — Authentication and Company Setup is complete.
- **Verified:** Audited the approved `Company`, `User`, and `UserRole` design; live PostgreSQL tables, native UUIDs, `timestamptz(3)` timestamps, required Company relation, `ON DELETE RESTRICT`, email uniqueness, Company index, role enum, and migration history; registration and versioned asynchronous scrypt security; login and fixed-HS256 JWT claims/configuration; Bearer middleware and database-authoritative current identity; `/auth/me`; two-company isolation; Company Profile validation/authorization; protected frontend routing; memory-only authentication; password visibility controls; and OWNER/ADMIN/STAFF Company Profile behavior.
- **Technical decisions:** Kept Phase 2H verification-first and made no application, dependency, Prisma schema, or migration change because no Phase 2 defect was found. Preserved the intentional refresh-to-login architecture and backend authorization boundary. Did not apply npm's proposed forced Prisma downgrade for the existing development-tool audit finding.
- **Automated verification:** All 4 backend test files passed with 66/66 tests. The frontend test file passed with 24/24 tests. Frontend lint and production build, backend typecheck and production build, Prisma validation and Client generation, migration status, live schema catalog inspection, and an explicit schema-drift comparison all passed. `git diff --check`, repository/secret/generated-file hygiene, and Phase 3 scope review passed after documentation finalization.
- **Manual E2E and visual verification:** A clean fictional Company A/Company B scenario verified registration, atomic Company plus initial `OWNER`, login, `/auth/me`, protected `/app`, Company Profile view/edit/save and GET persistence, logout, protected-route redirect, second login, expected refresh-to-login behavior, empty `localStorage`, `sessionStorage`, IndexedDB, cookies, and token-free URLs. Query/body/path Company-scope override attempts failed safely. A fictional `STAFF` could view the profile, saw `Read only`, had no edit controls, and received HTTP 403 on a manual PATCH. Login, registration, application shell, Company Profile view/edit, and STAFF visuals passed the lightweight review, including centered password icons and consistent profile alignment, separators, and padding.
- **Cleanup:** Removed one clearly disposable leftover Phase 2G user/company pair before the run. The fresh E2E removed its three Users first and two Companies second. Final database inspection found zero Phase 2/Phase 2H test records and left the two pre-existing non-test Companies/Users untouched.
- **Known issues:** The access token intentionally remains memory-only, so reload and hard navigation require login again. Both `npm audit` and `npm audit --omit=dev` still report the previously documented three high-severity findings through Prisma CLI → `@prisma/config` → `deepmerge-ts`; npm proposes a breaking Prisma 6.12.0 downgrade, so no forced audit fix was applied.
- **Next milestone:** None active. Development is intentionally paused after Phase 2. Phase 3 — Product and Inventory Module remains planned and has not started; it requires explicit user instruction.

## Phase 3A — Product & Inventory Domain Design

- **Status:** In progress. Phase 3 has officially started; the proposed Phase 3A design is documented and verified but awaits user review and approval.
- **Documented:** Defined the `Category`, `Product`, `InventoryMovement`, and `InventoryMovementType` domain; Company ownership; case-insensitive Company-scoped Category names; normalized Company-scoped SKU uniqueness; exact price and fractional quantity representations; simple Product units; reorder behavior; immutable movement history; opening stock; negative-stock prevention; archival; role assumptions; indexes; constraints; transactions; and concurrent update requirements.
- **Technical decisions:** Preserved `req.auth.companyId` as the only tenant scope and proposed tenant-aware composite foreign keys for Product-to-Category and movement-to-Product/User relationships. Preserved Category display casing with a PostgreSQL functional unique index, reserved inactive Category names and Product SKUs, used `Decimal(12,2)` for money and `Decimal(14,3)` for stock, required positive movement magnitudes whose type determines direction, and required an atomic conditional Product update plus InventoryMovement insert in one Phase 3E transaction.
- **Scope:** Documentation only. No Prisma Phase 3 model or enum, migration, Category/Product API, inventory service or endpoint, frontend Product/Inventory code, dependency, or Phase 3B+ implementation was added.
- **Verification:** Reviewed the required product, requirements, architecture, database, API, roadmap, testing, log, Prisma, migration, authentication, authorization, and Company-isolation files. The installed Prisma 7.9.1 validated a temporary non-persistent schema containing the proposed composite relation shapes; that file was removed immediately and did not generate a Client or touch the database. The real unchanged Prisma schema validated. `git diff --check`, changed-path and migration-scope inspection, Phase 3 implementation-scope review, and added-text secret-pattern checks passed.
- **Known issues:** No blocking domain or Phase 2 compatibility issue was found. PostgreSQL expression indexes and check constraints require inspected custom migration SQL in Phase 3B because Prisma Schema Language does not fully represent them. The local development role's previously documented shadow-database limitation also remains relevant to the future migration workflow.
- **Next milestone:** Review and approve the Phase 3A design before starting Phase 3B. Phase 3B has not started.

## Phase 3B — Product & Inventory Schema Migration

- **Status:** Complete. Phase 3 remains in progress; Phase 3C has not started.
- **Implemented:** Added the approved Prisma `Category`, `Product`, and immutable `InventoryMovement` models plus the three-value `InventoryMovementType` enum. Added Company relation collections and only the required User `(id, companyId)` candidate key/movement relation. Migration `20260819112747_add_product_inventory` creates the three plural-lowercase PostgreSQL tables, exact `numeric(12,2)` prices and `numeric(14,3)` quantities, UUID/timestamptz conventions, zero/active defaults, tenant-aware candidate keys and composite foreign keys, per-Company SKU uniqueness, and approved listing/history indexes.
- **Technical decisions:** Kept `req.auth.companyId` as the application authorization boundary while adding PostgreSQL tenant-integrity protection. Customized the reviewed migration SQL with a per-Company `lower(Category.name)` unique expression index; normalized/nonblank required-string checks; non-negative Product price, stock, and reorder checks; positive/non-negative movement checks; and type-aware arithmetic. `OPENING_BALANCE` requires `quantityBefore = 0` and `quantityAfter = quantity`; `MANUAL_IN` adds and `MANUAL_OUT` subtracts. All related deletes use `ON DELETE RESTRICT`, and inactive rows continue reserving Category names and Product SKUs.
- **Verification:** Prisma format, validation, Client generation, migration deploy/status, migration replay against the configured shadow database, and both migration-to-live and schema-to-live drift comparisons passed. PostgreSQL catalog checks confirmed actual tables, enum, columns, types, nullability, defaults, primary/candidate keys, indexes, checks, tenant-aware foreign keys, and restrictive delete actions. A 36-group transactional database scenario verified Company-scoped Category/SKU uniqueness, nullable Category assignment, all numeric/string/arithmetic checks, same-Company relationships, rejection of all three cross-Company relationship cases, archived SKU reservation, and historical delete protection; every fictional row was rolled back. All 66 existing backend tests, backend typecheck, backend build, `git diff --check`, scope review, and secret-hygiene review passed.
- **Scope:** No Category/Product route, controller, service, validation schema, inventory adjustment logic, frontend Product/Inventory functionality, dependency, or later-phase entity was added. The existing Phase 2 migration was not edited.
- **Known issues:** None blocking. PostgreSQL reports explicit `ON DELETE RESTRICT` failures with SQLSTATE `23001`, while invalid foreign-key inserts use `23503`; the verification expectation was corrected accordingly. The configured shadow database successfully supported migration replay in this run.
- **Next milestone:** ChatGPT/user review of Phase 3B implementation and migration before starting Phase 3C — Category & Product Backend.
