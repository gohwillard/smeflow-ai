# SMEFlow AI — Codex Project Instructions

## Project Purpose

SMEFlow AI is a portfolio project for a fresh Software Engineering graduate.

The objective is not to build a simple CRUD demo.

The project should demonstrate:
- Full-stack engineering
- Business understanding
- Relational database design
- Backend business logic
- REST API design
- Testing
- Deployment
- AI integration
- Architecture and documentation

The final project should be strong enough to discuss in software engineering,
business analyst, product and technical interviews.

## Product

SMEFlow AI is an AI-powered business management system for SMEs.

Core modules:

- Authentication
- Company
- Products
- Inventory
- Customers
- Suppliers
- Quotations
- Sales Orders
- Purchase Orders
- Invoices
- Dashboard
- AI Business Assistant

Core business flow:

Supplier
→ Purchase Order
→ Receive Goods
→ Inventory Increase

Customer
→ Quotation
→ Sales Order
→ Inventory Decrease
→ Invoice

Business Data
→ Dashboard
→ AI Insights

## Tech Stack

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS

Backend:
- Node.js
- Express
- TypeScript

Database:
- PostgreSQL
- Prisma

Other:
- Zod
- JWT
- Vitest
- Supertest
- Postman

Deployment:
- Vercel frontend
- Render backend
- Managed PostgreSQL

## Architecture

Use a modular monolith.

Backend modules should generally follow:

route
→ controller
→ service
→ repository / Prisma
→ PostgreSQL

Business logic belongs in the backend.

Do not place important business logic only in React components.

## Inventory Rule

Inventory must be traceable.

Do not simply modify product stock without recording why it changed.

Stock changes should create InventoryMovement records.

Phase 3 movement types are limited to:

OPENING_BALANCE
MANUAL_IN
MANUAL_OUT

Purchasing and Sales may add their own movement types only when those workflows
reach their approved design milestones.

## AI Rule

Do NOT prioritize AI before the core business system works.

Follow the canonical development order in `docs/06-development-roadmap.md`.

AI V1 must be read-only.

Do not allow an LLM to execute arbitrary generated SQL.

## Documentation

Before making major architecture or business-flow decisions, read:

- README.md
- docs/01-product-overview.md
- docs/02-requirements.md
- docs/03-system-architecture.md
- docs/04-database-design.md
- docs/05-api-plan.md
- docs/06-development-roadmap.md

Keep documentation aligned with implementation.

## Roadmap Governance

- `docs/06-development-roadmap.md` is the canonical development sequence.
- Before implementing a new milestone, identify the current roadmap milestone.
- Implement only the milestone explicitly requested by the user.
- Do not skip ahead or implement later-phase features proactively.
- If a request conflicts with the roadmap or current architecture, explain the conflict before implementing.
- A milestone must pass its relevant verification before it is marked complete.
- After completion, update README Current Status, the development log, and Current Development Stage where appropriate.
- Do not rename or renumber top-level phases without explicit user approval.

## Development Style

This project is also a learning project.

Do not blindly generate the whole application at once.

Prefer small, understandable milestones.

When making meaningful changes:

1. Explain what is being built.
2. Implement it.
3. Explain important code or architecture decisions.
4. Run relevant checks/tests.
5. Suggest an appropriate Git commit message.

Avoid unnecessary complexity.

Do not introduce microservices unless there is a strong reason.

Do not add new major dependencies without explaining why.

## Working Rules

- Always inspect the current repository before making changes.
- Read the relevant documentation before implementing a milestone.
- Do not assume files, architecture, dependencies, or behavior that have not been verified.
- Work only on the milestone explicitly requested by the user.
- Do not implement future phases early.
- Do not refactor working code purely for stylistic preference.
- Prefer small, reviewable changes.

If a requested change conflicts with the current architecture or documentation,
stop and explain the conflict before implementing it.

## Scope Control

Do not interpret a milestone broadly.

If the user requests Phase X, implement only the requirements of Phase X.

Do not proactively implement features belonging to later phases,
even if doing so would appear convenient.

Do not add:
- unrelated features
- unnecessary abstractions
- premature infrastructure
- unnecessary dependencies
- speculative future modules

Before adding a new production dependency:
1. Explain why it is required.
2. Confirm that the existing stack cannot reasonably solve the problem without it.
3. Prefer established, maintainable dependencies.

## Learning Mode

This is both a portfolio project and a learning project.

- Prefer understandable implementations over clever implementations.
- Explain important architecture decisions.
- Explain important backend and database decisions.
- Explain unfamiliar technologies when introducing them.
- Do not generate the entire application at once.
- Keep implementation aligned with what the user can reasonably understand and explain in an interview.
- Avoid unnecessary overengineering.

## Security and Secrets

- Never display, log, or commit secrets.
- Never expose `.env` contents.
- Never print a full `DATABASE_URL`.
- Never expose database passwords, JWT secrets, API keys, or credentials.
- Do not modify local credentials unless explicitly requested.
- Use `.env.example` only for safe placeholders.

## Verification

Before considering a milestone complete, run the checks relevant to the changed code.

These may include:

- lint
- typecheck
- build
- automated tests
- Prisma validation
- Prisma Client generation
- API/manual behavior verification

Also:

- inspect `git status`
- confirm no secrets are tracked
- confirm the requested behavior actually works
- confirm no later-phase work was introduced accidentally

Do not claim completion if required verification has not passed.

## Documentation Updates

After a milestone is successfully completed:

1. Update the root `README.md` Current Status section.
2. Append a concise entry to `docs/09-development-log.md`.
3. Update the `Current Development Stage` section in this `AGENTS.md` if the project stage changed.

The development log entry should include:
- milestone name
- status
- what was implemented
- important technical decisions
- verification performed
- known issues, if any
- next milestone

Do not rewrite unrelated documentation.

## Git Execution Rules

- Do not commit or push unless explicitly requested by the user.
- Do not create branches unless explicitly requested.
- After a successfully verified milestone, suggest one concise conventional-style commit message.
- Keep commits focused on one meaningful milestone or change.

## Git

Use meaningful conventional-style commits where practical.

Examples:

feat: add product creation API
feat: implement inventory movement tracking
fix: prevent duplicate purchase order receipt
docs: update database architecture
chore: configure eslint

Keep commits focused and understandable.

## Current Development Stage

Phase 0 — Repository and Planning is complete.

Phase 1 — Application Foundation is complete, including Phase 1D — Full-stack Foundation Verification.

The React frontend calls the Express health endpoint, and the Express backend verifies its local PostgreSQL connection through Prisma ORM 7. The complete browser-to-database development flow has been verified.

Node.js 22 should be used for this project.

Phase 2 — Authentication and Company Setup is complete.

Phase 2A — Company & User Domain Database Design is complete. It approved the `Company`, `User`, and `UserRole` design, the one-company-per-user MVP relationship, UUID and timestamp strategies, globally unique normalized user email, the company ownership boundary, and required constraints and indexes. Phase 2A changed documentation only; no Prisma models or migration were created.

Phase 2B — First Prisma Schema & Migration is complete. The reviewed design is implemented with Prisma-generated UUID v4 IDs stored as PostgreSQL-native UUIDs, `timestamptz(3)` timestamps, a required `User.companyId` relation using `ON DELETE RESTRICT`, and migration `20260818020913_init_company_user`. Database metadata, schema drift, isolated migration recreation, Prisma generation, typecheck, and build were verified.

Phase 2C — Registration & Password Security is complete. `POST /api/v1/auth/register` validates the five approved fields with Zod, stores normalized lowercase email, hashes opaque 15–128-character passwords with asynchronous Node.js scrypt and random salts, atomically creates a Company and explicit `OWNER`, maps duplicate email to HTTP 409, and returns only safe fields. Automated and manual verification passed. No schema or migration change was required.

Phase 2D — Login & JWT Authentication is complete. `POST /api/v1/auth/login` validates and normalizes email without applying the registration password minimum, verifies the existing versioned scrypt format asynchronously with defensive parsing and constant-time comparison, returns generic HTTP 401 invalid-credential errors, rejects inactive users with HTTP 403, and issues configured 30-minute HS256 access tokens through `jose`. Tokens contain only `sub`, `companyId`, `role`, `iat`, `exp`, `iss`, and `aud`; successful responses contain only safe user fields. All authentication tests and manual HTTP verification passed. No schema or migration change was required.

Phase 2E — Authentication Middleware & Company Isolation is complete. Access tokens are accepted only through the Bearer `Authorization` header and are cryptographically verified with Phase 2D's pinned HS256 configuration, issuer, audience, expiration, and required typed claims. Middleware reloads the current User, enforces existence, active state, company, and role, and establishes the typed `{ userId, companyId, role }` context from database values. `GET /api/v1/auth/me` returns only safe current-user fields. Company scope now comes from `req.auth.companyId`, not client request input. All 41 authentication tests and live HTTP verification passed. No dependency, schema, or migration change was required.

Phase 2F — Company Profile is complete. Authenticated `OWNER`, `ADMIN`, and `STAFF` users can retrieve only their own safe Company profile through `GET /api/v1/company/profile`. `OWNER` and `ADMIN` can partially update the five allowed fields through `PATCH /api/v1/company/profile`; `STAFF` receives HTTP 403 and remains read-only. Strict validation trims strings, rejects blanks and unknown or immutable fields, lowercases the non-unique Company contact email, preserves omitted fields, and accepts explicit `null` for the four optional profile fields. Reads and writes use only the database-validated `req.auth.companyId`. All 66 API tests and live HTTP verification passed. No dependency, Prisma schema, migration, or frontend authentication change was required.

Phase 2G — Protected Frontend Authentication Flow is complete. The Vite SPA now uses React Router for `/register`, `/login`, `/app`, and `/company`; a typed React Context keeps the access token and current User only in application memory; login confirms identity through `GET /api/v1/auth/me`; authenticated in-SPA navigation away from public routes, protected routes, local logout, and consistent authenticated API errors are implemented. Login and registration passwords have accessible visibility controls. `OWNER` and `ADMIN` can edit the five backend-approved Company Profile fields using normalized diff-only PATCH requests and backend-authoritative responses, while `STAFF` remains read-only and backend authorization remains authoritative. HTTP 401 clears local authentication while HTTP 403 preserves it. Refreshing or navigating through the address bar intentionally requires login again because no token is persisted to Web Storage, IndexedDB, cookies, or URLs. All 24 frontend tests, frontend lint/build, and live OWNER/STAFF browser verification passed. No backend contract, schema, or migration changed.

Phase 2H — Phase 2 Verification is complete. The approved Company/User domain, live PostgreSQL schema and migration, registration, login/JWT security, Bearer middleware, current-User database revalidation, Company isolation, `/auth/me`, Company Profile authorization, protected frontend flow, password controls, memory-only token behavior, and OWNER/ADMIN/STAFF UX were fully audited. All 66 backend tests and 24 frontend tests passed, along with frontend lint/build, backend typecheck/build, Prisma validation/generation/migration status, schema-drift comparison, a clean fictional Company A/Company B browser/API/database E2E scenario, visual regression review, security review, and test-data cleanup. No Phase 2 application defect, dependency change, schema change, or migration was required.

Phase 3 — Product and Inventory Module is complete.

Phase 3A — Product & Inventory Domain Design is complete and approved. It documented the approved `Category`, `Product`, `InventoryMovement`, ownership, tenant-safety, decimal, traceability, lifecycle, authorization, constraint, index, transaction, and concurrency decisions in `docs/04-database-design.md`.

Phase 3B — Product & Inventory Schema Migration is complete. Prisma and migration `20260819112747_add_product_inventory` implement the approved models and enum, tenant-aware composite keys and foreign keys, exact decimal types, lifecycle defaults, business uniqueness, indexes, and customized PostgreSQL string, numeric, and movement-arithmetic constraints. Prisma validation/generation/status/replay, drift checks, PostgreSQL catalog and transactional behavior checks, cleanup, all 66 backend tests, backend typecheck, and backend build passed. The existing Phase 2 migration was not changed.

Phase 3C — Category & Product Backend is complete after user/ChatGPT manual API verification. The authenticated Category and Product APIs use strict Zod contracts, database-validated Company scope, OWNER/ADMIN writes, STAFF reads, safe archive behavior, active same-Company Category assignment, fixed-scale exact decimal strings, backend-authoritative uppercase Product-unit normalization, and read-only `quantityOnHand`. All 137 backend tests pass.

Phase 3D — Product Frontend is complete after user/ChatGPT manual browser approval. Protected Product list/create/detail/edit and Category management routes reuse the Phase 2 application shell, memory-only authentication, and native authenticated fetch layer. OWNER/ADMIN management, STAFF read-only UX, active/archived Category behavior, Uncategorized Products, exact decimal strings, accessible confirmed lifecycle actions, deliberate loading/empty/error states, responsive desktop-table/mobile-card presentation, and display-only stock remain verified.

Phase 3E — Inventory Movement & Manual Adjustment is complete after user/ChatGPT manual API and browser approval. Product-scoped history is authenticated, Company-isolated, immutable, deterministic newest-first, and available to OWNER, ADMIN, and STAFF with safe creator fields. OWNER/ADMIN adjustments strictly accept only type, positive exact decimal-string quantity, and optional normalized note. Opening Balance, Stock In, and Stock Out atomically apply an active Product's conditional Decimal balance update and create exactly one backend-derived InventoryMovement in one Prisma transaction. PostgreSQL row locking from the conditional update prevents competing stock-outs from spending the same balance; insufficient stock and all rejected operations leave both tables unchanged. Archived Products remain historically readable but cannot be adjusted. Product details provide history loading/empty/error/populated states and a responsive accessible adjustment dialog; STAFF has no management action.

Phase 3F — Product Search & Low Stock is complete after user/ChatGPT manual API and browser approval. The authenticated Product list strictly accepts only optional trimmed `search` and literal `lowStock=true`. Search matches SKU or Product name through case-insensitive PostgreSQL substring predicates. Low-stock filtering remains Company-scoped and database-authoritative through Prisma's typed Product field reference, enforcing `isActive = true AND quantityOnHand <= reorderLevel` without JavaScript Number conversion or raw SQL. Search and low stock combine with AND semantics while deterministic Product ordering and the existing safe response stay unchanged. The responsive Product list provides explicit search and clear/reset controls, a low-stock-only checkbox, distinct filtered empty states, and an amber `LOW STOCK` inventory-health badge separate from `ACTIVE`/`ARCHIVED` lifecycle status. Active filter state is preserved during Product-list inventory refetches, OWNER/ADMIN management remains intact, and STAFF retains the same read-only discovery access. All 207 backend tests and 106 frontend tests pass, with backend typecheck/build, frontend ESLint/build, Prisma validation/generation/migration status, `git diff --check`, security/scope review, and responsive visual review. No dependency, Prisma schema, migration, pagination, reorder automation, notification, Dashboard, AI, or stock-transaction change was added.

Phase 3G — Phase 3 Final Verification is complete after final user/ChatGPT acceptance. The complete Category, Product, Inventory, search, and low-stock subsystem passed repository/scope, live PostgreSQL catalog, migration/drift, role, Company-isolation, strict-injection, exact-Decimal, error-safety, authentication-regression, accessibility, responsive, and production-readiness review. A disposable real-API/two-Company scenario re-proved the approved inventory lifecycle, Opening Balance eligibility, safe failure behavior, search cases, low-stock rule, combined filters, filtered stock-refresh behavior, STAFF restrictions, and tenant-local failures, then removed all fictional records. The real transaction-rollback and concurrent stock-out regressions passed within all 207 backend tests across 8 files; all 106 frontend tests across 5 files also passed. Backend typecheck/build, frontend lint/build, Prisma validate/generate/migrate status, both drift comparisons, and `git diff --check` passed. The responsive browser review passed at 1440×1000, 430×932, and 390×844. No application defect, dependency, schema, migration, or new business feature was introduced during verification.

Phase 4 — Customers and Suppliers is current.

Phase 4A — Customer & Supplier Domain Design is complete and approved. It keeps Customer and Supplier as separate Company-owned master-data entities; defines fields, maximum lengths, normalization, deliberately non-unique names/contact details, UUID/timestamp conventions, tenant-aware future relationships, restrictive deletion, archive/reactivation, OWNER/ADMIN management, STAFF read-only access, strict future PATCH behavior, and tenant-local not-found behavior; and requires future transactional documents to snapshot mutable partner details where their own design needs historical accuracy.

Phase 4B — Customer & Supplier Schema Migration is complete and approved. Prisma and migration `20260824025721_add_customer_supplier` implement only the approved `Customer` and `Supplier` models, direct Company relationships using `ON DELETE RESTRICT`, bounded nullable strings, native UUIDs, `timestamptz(3)` timestamps, lifecycle defaults, `(id, companyId)` candidate keys, `(companyId, isActive)` indexes, and reviewed trimmed/non-empty string checks. Migration application/status/replay, two no-drift comparisons, live PostgreSQL catalog inspection, transactional integrity smoke checks with rollback cleanup, all 207 baseline backend tests, backend typecheck, backend build, and repository hygiene checks passed. Existing migrations remain unchanged.

Phase 4C — Customer & Supplier Backend is complete and approved. Authenticated Customer and Supplier list, detail, create, partial-update, idempotent archive, and explicit reactivation APIs use strict Zod contracts, server-side normalization, safe response selections, database-validated `req.auth.companyId` scope, tenant-local not-found behavior, OWNER/ADMIN writes, and STAFF reads. Duplicate business data remains allowed. All 316 backend tests across 10 files pass, including 109 focused Phase 4C tests, together with backend typecheck/build, Prisma validation/generation/migration status, and repository hygiene checks.

Phase 4D — Customer & Supplier Frontend is complete after manual browser approval. Protected Customer and Supplier list, create, detail, and edit routes use typed native-fetch helpers and the existing memory-only authentication flow. OWNER/ADMIN management, STAFF read-only UX, active/archived lifecycle presentation, custom archive/reactivation confirmation, diff-only edit payloads, natural optional-field clearing to `null`, loading/empty/error/not-found states, accessible forms, responsive desktop-table/mobile-card presentation, and the approved Phase 4D UI polish are preserved.

Phase 4E — Customer & Supplier Search and Filtering is complete after manual browser/API approval. The authenticated Customer and Supplier list APIs strictly accept only optional trimmed `search` and `status=active|archived`. Omitted status includes active and archived rows; search performs case-insensitive PostgreSQL substring matching over exactly name, registration number, contact person, email, and phone; and search, lifecycle, and database-validated Company scope combine with AND semantics. The list UIs provide explicit search, All/Active/Archived selection, clear and filtered-empty behavior, STAFF access, and backend-authoritative filter-aware refetches after archive/reactivation. All 407 backend tests across 12 files and 163 frontend tests across 8 files pass, together with backend typecheck/build, frontend lint/build, Prisma validation/generation/migration status, and repository hygiene checks. No dependency, schema, migration, pagination, sorting API, specialized index, related history, Purchasing, Sales, Dashboard, or AI work was added.

Phase 4F — Related Transaction History Foundation is complete after manual browser approval. Customer and Supplier detail pages show authenticated read-only Transaction History sections for OWNER, ADMIN, and STAFF, with truthful workflow-specific future-state wording and no fabricated records or metrics. They make no history API request. Documentation fixes the future active-party selection, archived-party reference, tenant-aware composite foreign-key, and immutable party-snapshot rules. Six focused frontend role cases were added; all 171 frontend tests across 8 files pass, together with frontend lint/build and Prisma validation/generation/migration status. No backend application code, dependency, Prisma schema, migration, Purchase Order, Quotation, Sales Order, Invoice, payment/accounting behavior, InventoryMovement type, generic Transaction abstraction, or fake history data was added.

Phase 4G — Phase 4 Final Verification is current, implemented, and Codex-verified, awaiting final manual approval. The complete Customer and Supplier subsystem passed domain and scope review; live PostgreSQL column, constraint, index, foreign-key, and migration inspection; migration-to-live and schema-to-live no-drift comparisons; strict request/query validation; OWNER/ADMIN/STAFF authorization; Company isolation; archive/reactivation; search/filter AND semantics; frontend integration; accessibility and responsive source review; Phase 3 and authentication regression; and secret/dependency/generated-file hygiene. Four focused backend cases now explicitly prove archived-filter tenant isolation and `pageSize` rejection for both modules. All 411 backend tests across 12 files and all 171 frontend tests across 8 files pass. Backend typecheck/build, frontend ESLint/build, Prisma validate/generate/migrate status, exactly three migrations, and `git diff --check` pass. No application defect, dependency, Prisma schema, migration, generated contract, or new business feature was introduced. Phase 4 is not officially complete until user manual acceptance. Phase 5 and Phase 6 have not started.
