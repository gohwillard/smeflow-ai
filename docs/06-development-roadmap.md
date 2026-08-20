# 06 — Development Roadmap

## Purpose and Authority

This document is the canonical development sequence for SMEFlow AI. It defines
the fixed top-level phases, the small sub-milestones within each phase, and the
conditions required to mark work complete.

Top-level phase names and numbers are fixed. They must not be renamed or
renumbered without explicit user approval.

## Status Legend

- ✅ Completed — implementation and relevant verification are complete.
- 🚧 Current — actively being implemented.
- ⬜ Planned — future work that has not started.

## Roadmap Status Rules

- Statuses must reflect verified repository state, not only the original plan.
- Future work must not be marked completed.
- A phase becomes 🚧 Current when work begins on its first incomplete
  sub-milestone; Phase 2 therefore becomes current only when Phase 2A begins.
- Completion is governed by the milestone verification rules at the end of this
  document.

The current project state is:

- Phase 0 — Repository and Planning: ✅ Completed
- Phase 1 — Application Foundation: ✅ Completed
- Phase 2 — Authentication and Company Setup: ✅ Completed
- Phase 2A — Company & User Domain Database Design: ✅ Completed
- Phase 2B — First Prisma Schema & Migration: ✅ Completed
- Phase 2C — Registration & Password Security: ✅ Completed
- Phase 2D — Login & JWT Authentication: ✅ Completed
- Phase 2E — Authentication Middleware & Company Isolation: ✅ Completed
- Phase 2F — Company Profile: ✅ Completed
- Phase 2G — Protected Frontend Authentication Flow: ✅ Completed
- Phase 2H — Phase 2 Verification: ✅ Completed
- Phase 3 — Product and Inventory Module: 🚧 Current
- Phase 3A — Product & Inventory Domain Design: ✅ Completed
- Phase 3B — Product & Inventory Schema Migration: ✅ Completed
- Phase 3C — Category & Product Backend: ✅ Completed
- Phase 3D — Product Frontend: ✅ Completed
- Phase 3E — Inventory Movement & Manual Adjustment: ✅ Completed
- Phase 3F — Product Search & Low Stock: 🚧 Implemented and Codex-verified;
  awaiting manual verification

Phase 3 is in progress. Phase 3A through Phase 3E are complete. Phase 3F is
implemented and its automated, integration, security, and visual verification
passes, but it awaits user/ChatGPT manual verification before final approval.
Phase 3G and all later milestones have not started.

---

## Phase 0 — Repository and Planning

**Status:** ✅ Completed

**Goal:** Establish professional project foundations and prepare the repository
for structured application development.

### Completed work

- GitHub repository and Git history
- Root README and project documentation structure
- npm monorepo/workspace structure for the web app, API, and shared package area
- TypeScript foundation for the frontend and backend
- Frontend linting configuration
- Git ignore and environment-example setup
- Project-specific `AGENTS.md` instructions
- Node.js 22 project version configuration
- Initial product, requirements, architecture, database, API, testing,
  deployment, and roadmap planning

### Definition of Done

The repository has a documented product direction, an agreed modular-monolith
architecture, a maintainable workspace structure, safe environment conventions,
and the project configuration needed to begin application development in small,
reviewable milestones.

---

## Phase 1 — Application Foundation

**Status:** ✅ Completed

**Goal:** Establish and verify the complete local full-stack development
foundation.

### Phase 1A — Express + TypeScript Backend Foundation

**Status:** ✅ Completed

- Express backend with TypeScript
- Environment-based configuration
- CORS configuration
- `GET /api/v1/health` endpoint
- Backend development, typecheck, build, and start scripts
- Typechecking and production-build verification

### Phase 1B — React ↔ Express Connection

**Status:** ✅ Completed

- React + TypeScript + Vite frontend
- Centralized frontend API layer
- `VITE_API_BASE_URL` environment configuration
- Frontend request to `/api/v1/health`
- API checking, online, and offline UI states
- Frontend-to-backend communication and CORS verification

### Phase 1C — PostgreSQL + Prisma Foundation

**Status:** ✅ Completed

- PostgreSQL 18 local environment
- Prisma ORM 7
- PostgreSQL driver adapter
- Reusable Prisma client/database module
- Database-aware health check
- HTTP 200 response when the database is connected
- HTTP 503 response when the database is disconnected
- Prisma schema validation and Prisma Client generation
- No application or business models
- No migrations

The absence of a Phase 1 migration is intentional. Phase 1 established and
verified the PostgreSQL and Prisma infrastructure without inventing fake or
placeholder business tables. The first migration must represent a reviewed,
meaningful business domain and therefore belongs to Phase 2B.

### Phase 1D — Full-stack Foundation Verification

**Status:** ✅ Completed

- Frontend lint and production build
- Backend typecheck and production build
- Prisma schema validation and Prisma Client generation
- React → Express → Prisma → PostgreSQL verification
- Environment and repository hygiene checks
- Tracked-file, ignored-secret, and safe-example verification

### Definition of Done

The complete local development flow works:

```text
React
→ Express
→ Prisma
→ PostgreSQL
```

Application and business models were intentionally deferred until their domains
could be designed and reviewed.

---

## Phase 2 — Authentication and Company Setup

**Status:** ✅ Completed

**Goal:** Establish SMEFlow's first real business domain, authentication
foundation, and company-level data ownership boundary.

### Phase 2A — Company & User Domain Database Design

**Status:** ✅ Completed

This milestone is design only. Do not create a migration during Phase 2A.

Design and document:

- `Company`
- `User`
- `UserRole`
- Company → Users relationship
- MVP rule that one user belongs to one company
- UUID strategy
- Timestamp strategy
- Company data-ownership rule
- Required indexes
- Email and other uniqueness decisions
- PostgreSQL table-naming conventions
- Authentication-related decisions intentionally deferred to later milestones

### Phase 2B — First Prisma Schema & Migration

**Status:** ✅ Completed

- Implement the reviewed `Company` model
- Implement the reviewed `User` model
- Implement the reviewed `UserRole` enum
- Validate the Prisma schema
- Generate Prisma Client
- Create SMEFlow's first meaningful migration
- Inspect the generated PostgreSQL schema
- Verify primary keys, foreign keys, indexes, and unique constraints
- Verify the migration can be recreated safely in development

Implemented as migration `20260818020913_init_company_user`. The migration
creates only the `companies` and `users` domain tables, the `UserRole` enum, and
their approved keys, relationship, defaults, unique constraint, and index.
PostgreSQL catalog inspection and an isolated recreation check verified the
resulting schema.

This is SMEFlow's first real business migration. Do not create a dummy migration
to satisfy the superseded Phase 1 checklist.

### Phase 2C — Registration & Password Security

**Status:** ✅ Completed

- Registration API
- Input validation
- Password hashing
- Appropriate creation of a company and its `OWNER` user
- Duplicate-email handling
- Database transaction where necessary
- No plaintext password storage or exposure
- Registration tests

Implemented as `POST /api/v1/auth/register`. Zod validates the five approved
registration fields, names and email are trimmed, and email is lowercased before
persistence. Passwords remain opaque 15–128-character values and are hashed with
Node.js 22's asynchronous scrypt using a random 16-byte salt, 64-byte derived
key, and versioned self-describing storage format.

A nested Prisma create atomically inserts the Company and its explicit `OWNER`
User. The database email-unique constraint remains authoritative and maps
duplicate normalized emails to HTTP 409. Responses select only safe company and
user fields. Integration tests verify success, normalization, owner assignment,
atomic rollback, hashed storage, response safety, duplicates, validation, and
random salts. No schema or migration change was required.

### Phase 2D — Login & JWT Authentication

**Status:** ✅ Completed

- Login API
- Credential verification
- JWT generation
- Secure JWT configuration
- Authentication response contract
- Invalid-login handling
- Relevant tests

Implemented as `POST /api/v1/auth/login`. Login trims and lowercases email while
treating the supplied password as an opaque, non-empty string. The extended
password utility defensively parses the existing self-describing scrypt format,
derives with the stored parameters and salt, and uses a length check followed by
Node.js `timingSafeEqual`. Unknown users, incorrect passwords, and malformed
stored hashes share the safe HTTP 401 `INVALID_CREDENTIALS` response; inactive
users receive HTTP 403 `ACCOUNT_INACTIVE` and no token.

Successful login returns safe user fields and a `jose`-signed HS256 access token.
The token contains `sub`, `companyId`, `role`, `iat`, `exp`, `iss`, and `aud`,
uses the configured 30-minute lifetime, and is backed by required environment
configuration with a minimum 32-byte signing secret. Integration and live HTTP
verification passed. No middleware, protected route, refresh/session
infrastructure, schema change, or migration was introduced.

### Phase 2E — Authentication Middleware & Company Isolation

**Status:** ✅ Completed

- JWT verification middleware
- Authenticated-user request context
- Company ownership boundary
- Prevention of access to another company's records
- Authorization foundation
- Relevant authorization and security tests

Implemented reusable Bearer authentication middleware and the protected
`GET /api/v1/auth/me` endpoint. The middleware uses `jose` cryptographic
verification with pinned HS256, configured issuer and audience, expiration, and
required registered and custom claims. It then loads the current User by token
subject and rejects missing Users, inactive accounts, and stale company or role
claims before establishing the typed `{ userId, companyId, role }` request
context from database values.

Company scope is therefore derived from `req.auth.companyId`, never arbitrary
request input. Integration tests cover header handling, invalid signatures,
expiration, issuer, audience, algorithm restrictions, claim validation, deleted
and inactive Users, stale company and role claims, safe response fields, and a
two-company scope-override attempt. No schema, migration, role-permission matrix,
frontend authentication, or later business module was introduced.

### Phase 2F — Company Profile

**Status:** ✅ Completed

- Retrieve the authenticated user's company profile
- Update allowed company details
- Backend validation
- Company-scoped access
- Frontend company-profile screen where appropriate

Implemented authenticated `GET` and `PATCH /api/v1/company/profile` endpoints.
Both use the database-validated `req.auth.companyId` as their only Company scope
and select only the eight safe profile response fields. All roles may read;
`OWNER` and `ADMIN` may update, while `STAFF` receives HTTP 403 and remains
read-only.

PATCH strictly accepts only `name`, `registrationNumber`, `email`, `phone`, and
`address`. Supplied strings are trimmed, company contact email is validated and
lowercased, omitted fields remain unchanged, and the four optional fields can be
cleared with explicit `null`. Integration and live HTTP verification passed,
including two-company isolation and forbidden-field attempts. The profile UI
was intentionally deferred because protected frontend authentication belongs to
Phase 2G. No dependency, schema, or migration change was required.

### Phase 2G — Protected Frontend Authentication Flow

**Status:** ✅ Completed

- Registration page
- Login page
- Authentication state
- Protected routes
- Logout
- Authenticated API handling
- Loading and error states

Do not introduce a global state library unless the implementation demonstrates a
real need that the existing stack cannot reasonably address.

Implemented as a normal Vite SPA with React Router declarative routing for
`/register`, `/login`, `/app`, and `/company`. A small typed React Context owns
the access token, current User, authentication status, login, registration,
logout, and authenticated-request handling. Login confirms the authenticated
User through `GET /api/v1/auth/me` before establishing the frontend session;
the JWT is never decoded into trusted frontend User state.

The access token is intentionally held only in React application memory. It is
not persisted in `localStorage`, `sessionStorage`, IndexedDB, cookies, or URLs,
so refreshing the SPA returns the user to login. An address-bar navigation also
reloads the document and has the same intentional result. Persistent
authentication and HttpOnly-cookie session design remain deferred. Reusable
route guards redirect unauthenticated users away from protected pages and, while
the SPA remains loaded, redirect authenticated users away from login and
registration to `/app`. Authenticated API HTTP 401 responses clear the local
session, while HTTP 403 responses preserve it.

The registration and login forms handle validation, approved backend error
codes, network failures, and submission states without retaining submitted
passwords. Both password inputs provide keyboard-accessible show/hide controls
with changing accessible labels. The minimal authenticated home shows only safe
current-User data. The protected Company Profile page lets `OWNER` and `ADMIN`
edit only `name`, `registrationNumber`, `email`, `phone`, and `address` through
the existing PATCH API; `STAFF` remains read-only. Optional blank fields become
`null`, unchanged fields are omitted, the backend response replaces local saved
state, and backend authorization remains authoritative. React Router was added
for SPA routing; Vitest, React Testing Library, and jsdom were added as the
focused frontend test setup. All 24 frontend flow tests, frontend lint and
production build, and live OWNER/STAFF browser verification passed. No backend
contract, schema, migration, later business module, or Phase 2H verification
work was introduced.

### Phase 2H — Phase 2 Verification

**Status:** ✅ Completed

Verify the complete flow:

```text
Register
→ Company created
→ OWNER user created
→ Login
→ JWT
→ Protected API
→ Company-isolated data
```

The final verification audited the approved Company/User design, live
PostgreSQL schema and migration history, registration, login and JWT security,
Bearer middleware, current-User revalidation, Company isolation, Company
Profile authorization, and the protected frontend flow. Prisma validation,
Client generation, migration status, and a schema-drift comparison passed. All
66 backend tests and all 24 frontend tests passed, as did frontend lint and
production build plus backend typecheck and production build.

A clean fictional browser/API/database scenario verified registration, owner
creation, login, `/auth/me`, protected navigation, Company Profile update and
persistence, logout, second login, intentional refresh-to-login behavior, empty
Web Storage/IndexedDB/cookies, Company A/Company B isolation, and STAFF
read-only behavior with backend HTTP 403 enforcement. Login, registration,
application shell, Company Profile view/edit, and STAFF read-only visuals were
reviewed without redesign. Disposable records were removed in foreign-key
order. No Phase 2 defect, dependency change, Prisma schema change, or migration
was required.

### Definition of Done

A new user can register, sign in, access protected pages, and access only data
belonging to their company.

Phase 2 is complete. Phase 3 has since completed Phase 3A through Phase 3E and
implemented Phase 3F, which awaits its final manual verification.

---

## Phase 3 — Product and Inventory Module

**Status:** 🚧 Current

**Goal:** Build the first major operational SME module.

### Phase 3A — Product & Inventory Domain Design

**Status:** ✅ Completed

Design and review:

- `Category`
- `Product`
- `InventoryMovement`
- Entity relationships
- Company ownership
- SKU uniqueness rules
- Price representation
- Quantity representation
- Product unit and reorder-level rules
- Inventory movement types
- Inventory traceability and negative-stock rules
- Archive/deactivate behavior and authorization assumptions
- Transactional integrity and concurrent stock updates
- Tenant-aware relationships
- Indexes and constraints

This documentation-only milestone produced the reviewed and approved design now
implemented by Phase 3B. It added no Prisma model, migration, API, or frontend
implementation itself.

### Phase 3B — Product & Inventory Schema Migration

**Status:** ✅ Completed

- Implement only the approved Prisma models
- Create the migration
- Verify the resulting database structure, relationships, indexes, and constraints

Implemented as migration `20260819112747_add_product_inventory`. It adds only
the approved `Category`, `Product`, `InventoryMovement`, and
`InventoryMovementType` schema, the minimum User/Company relation additions,
tenant-aware composite keys and foreign keys, exact decimal fields, lifecycle
defaults, business uniqueness, listing/history indexes, and customized
PostgreSQL expression/check constraints. Prisma validation and generation,
migration application/status/replay, two drift comparisons, live PostgreSQL
catalog inspection, transactional integrity/isolation checks, fictional-record
rollback, all 66 existing backend tests, backend typecheck, and backend build
passed. Phase 3C has since been implemented without changing this schema or
migration.

### Phase 3C — Category & Product Backend

**Status:** ✅ Completed

- Authenticated Category and Product CRUD APIs
- Strict Zod body and UUID-parameter validation
- Company scope derived only from `req.auth.companyId`
- OWNER/ADMIN management and STAFF read-only authorization
- Case-insensitive Category-name and normalized SKU conflicts mapped safely
- Exact decimal-string API boundary and read-only `quantityOnHand`
- Active same-Company Category assignment with historical inactive links retained
- Idempotent archive/deactivate behavior without hard deletion or stock changes
- 71 focused Category/Product tests plus all 66 Phase 2 regressions passing

Automated verification and user/ChatGPT manual API verification passed before
Phase 3D began.

### Phase 3D — Product Frontend

**Status:** ✅ Completed

- Product list
- Create product
- Edit product
- Product details
- Category handling
- Loading, error, and empty states

Implemented protected `/products`, `/products/new`, `/products/:productId`,
`/products/:productId/edit`, and `/categories` routes in the existing React
Router application shell. The frontend reuses memory-only authentication,
authenticated native fetch handling, and page-local state. OWNER and ADMIN can
manage Product/Category master data and lifecycle state; STAFF receives
read-only views. Active Category selection, archived historical relationships,
Uncategorized Products, exact decimal strings, safe API errors, reusable
accessible lifecycle confirmation, and duplicate-submission prevention are
covered. Product lists use an aligned desktop table and stacked mobile cards.
`quantityOnHand` is displayed only and is absent from Product request construction.
The backend now also trims and uppercases Product units on both create and update.

All Phase 3D automated and visual checks passed, followed by user/ChatGPT manual
browser approval. Its Product CRUD stock-write prohibition remains unchanged in
Phase 3E.

### Phase 3E — Inventory Movement & Manual Adjustment

**Status:** ✅ Completed

- Product-scoped immutable InventoryMovement history with safe creator fields
- Controlled Opening Balance, Stock In, and Stock Out operations
- Company and creator scope derived from authenticated request context
- OWNER/ADMIN adjustment authorization and STAFF read-only access
- Exact positive decimal-string request and fixed-scale response contracts
- Atomic conditional Product balance update plus one movement insert
- Concurrency-safe negative-stock prevention through PostgreSQL row locking
- Active-Product enforcement and readable archived history
- Responsive Product-detail history and accessible adjustment dialog
- Real concurrency and forced transaction-rollback integration regressions

The frontend never arbitrarily overwrites stock quantity. Every successful stock
change is controlled by backend business logic and records exactly one movement.
All 176 backend tests and 88 frontend tests pass with typecheck, lint, builds,
Prisma validation/generation/status, security/scope review, and
1440×1000/390×844 visual review. User/ChatGPT manual API and browser verification
subsequently passed before Phase 3F started.

### Phase 3F — Product Search & Low Stock

**Status:** 🚧 Implemented and Codex-verified; awaiting manual verification

- Strict optional `search` and literal `lowStock=true` parameters on the existing
  authenticated Product list endpoint
- Trimmed case-insensitive substring search over SKU and Product name
- Company scope derived only from `req.auth.companyId` for search, low stock, and
  combined queries
- Database-authoritative exact Decimal rule:
  `isActive = true AND quantityOnHand <= reorderLevel`
- Prisma typed field-reference comparison with no raw SQL or JavaScript Number
  conversion
- Search and low-stock filters combined with AND semantics while preserving
  deterministic Product order and the safe response contract
- Responsive explicit-search and low-stock-only controls with clear/reset and
  distinct filtered no-result behavior
- Restrained low-stock inventory indicator separate from Product lifecycle
- Filter-aware Product list refetch after inventory adjustments and filtered
  lifecycle changes
- OWNER/ADMIN management preserved and STAFF discovery kept read-only
- No new index because the current MVP behavior provides no measured need

All 207 backend tests and 106 frontend tests pass, together with backend
typecheck/build, frontend ESLint/build, Prisma validation/generation/migration
status, security/scope review, `git diff --check`, and headless-Chrome review at
1440×1000 and 390×844. No dependency, schema, migration, pagination, automatic
reorder, notification, Dashboard, AI, stock-transaction change, or Phase 3G work
was added. Manual API/browser verification and user/ChatGPT approval remain
required before Phase 3G may start.

### Phase 3G — Product & Inventory Verification

**Status:** ⬜ Planned

Verify at minimum:

- Company isolation
- SKU constraints
- Inventory traceability
- Negative-stock prevention
- Stock-adjustment correctness

### Definition of Done

Users can manage products and categories, track stock through inventory
movements, perform controlled adjustments, search products, and identify
low-stock items.

---

## Phase 4 — Customers and Suppliers

**Status:** ⬜ Planned

**Goal:** Create the external-party master data required for purchasing and
sales.

### Phase 4A — Customer & Supplier Domain Design

**Status:** ⬜ Planned

Design fields, company ownership, indexes, relationships, uniqueness decisions,
and future transaction relationships.

### Phase 4B — Customer & Supplier Schema Migration

**Status:** ⬜ Planned

Implement the approved schema, create the migration, and verify its database
structure and constraints.

### Phase 4C — Customer Backend & Frontend

**Status:** ⬜ Planned

- CRUD
- Search and filtering
- Customer details
- Validation
- Company isolation

### Phase 4D — Supplier Backend & Frontend

**Status:** ⬜ Planned

- CRUD
- Search and filtering
- Supplier details
- Validation
- Company isolation

### Phase 4E — Related Transaction History Foundation

**Status:** ⬜ Planned

Prepare customer and supplier detail structures for future transaction history.
Do not invent or prematurely implement purchasing or sales records.

### Phase 4F — Phase 4 Verification

**Status:** ⬜ Planned

Verify CRUD behavior, search, company isolation, and data integrity.

### Definition of Done

Users can manage customers and suppliers securely and consistently.

---

## Phase 5 — Purchasing Workflow

**Status:** ⬜ Planned

**Goal:** Implement the complete supplier → purchase → stock-in workflow.

```text
Supplier
→ Purchase Order
→ Receive Items
→ Inventory Movement
→ Stock Increase
```

### Phase 5A — Purchasing Domain Design

**Status:** ⬜ Planned

Design and review:

- `PurchaseOrder`
- `PurchaseOrderItem`
- Statuses and allowed transitions
- Numbering strategy
- `receivedQuantity`
- Totals
- Supplier and product relationships
- Company ownership
- Partial-receiving decision
- Idempotency requirements
- Transaction boundaries

### Phase 5B — Purchasing Schema Migration

**Status:** ⬜ Planned

Implement the approved models, create the migration, and verify the resulting
database structure and constraints.

### Phase 5C — Purchase Order Backend

**Status:** ⬜ Planned

- Create purchase order
- Add items
- Update allowed fields
- Enforce status transitions
- Calculate totals
- Validate input and business rules
- Enforce company isolation

### Phase 5D — Purchase Receiving

**Status:** ⬜ Planned

- Receive items
- Create inventory movements
- Increase stock
- Use an appropriate database transaction
- Protect against duplicate receiving
- Support partial receiving only if approved during design

### Phase 5E — Purchasing Frontend

**Status:** ⬜ Planned

- Purchase-order list
- Create and edit workflow
- Purchase-order details
- Receiving workflow
- Status display
- Loading and error states

### Phase 5F — Purchasing Tests & Verification

**Status:** ⬜ Planned

Verify at minimum:

- Stock increases correctly
- Receiving remains traceable through inventory movements
- The same receiving event cannot accidentally increase stock twice
- Invalid status transitions are rejected
- Company isolation works

### Definition of Done

A supplier purchase order can be created and received, producing accurate,
traceable inventory increases.

---

## Phase 6 — Sales Workflow

**Status:** ⬜ Planned

**Goal:** Implement the complete customer sales flow.

```text
Customer
→ Quotation
→ Sales Order
→ Fulfilment
→ Inventory Movement
→ Invoice
```

### Phase 6A — Sales Domain Design

**Status:** ⬜ Planned

Design and review:

- `Quotation`
- `QuotationItem`
- `SalesOrder`
- `SalesOrderItem`
- `Invoice`
- Statuses and allowed transitions
- Numbering strategies
- Totals
- Customer and product relationships
- Quotation conversion rules
- Stock-fulfilment timing
- Invoice rules
- Idempotency requirements

### Phase 6B — Sales Schema Migration

**Status:** ⬜ Planned

Implement the approved models, create the migration, and verify the resulting
database structure and constraints.

### Phase 6C — Quotation Workflow

**Status:** ⬜ Planned

- Create quotations
- Manage line items
- Calculate totals
- Enforce statuses
- Support expiry where appropriate
- Provide the frontend quotation workflow

### Phase 6D — Quotation → Sales Order Conversion

**Status:** ⬜ Planned

- Convert an accepted quotation
- Prevent duplicate conversion
- Preserve relevant commercial information
- Validate conversion rules
- Use a transaction where appropriate

### Phase 6E — Sales Order Fulfilment & Inventory

**Status:** ⬜ Planned

- Enforce sales-order statuses
- Fulfil an order
- Validate available stock
- Create inventory movements
- Decrease stock
- Use an appropriate database transaction
- Handle insufficient stock

### Phase 6F — Invoice Workflow

**Status:** ⬜ Planned

- Generate an invoice
- Enforce invoice statuses
- Record a due date
- Represent amount paid and outstanding according to the approved design
- Provide frontend invoice views

SMEFlow must not expand into a complete accounting or general-ledger product.

### Phase 6G — Sales Tests & Verification

**Status:** ⬜ Planned

Verify at minimum:

- Quotation totals
- Duplicate-conversion prevention
- Insufficient-stock handling
- Stock reduction and movement traceability
- Invoice totals
- Company isolation
- Invalid status transitions

### Definition of Done

A customer quotation can progress into a sales order, stock can be fulfilled
safely, and an invoice can be generated.

---

## Phase 7 — Dashboard

**Status:** ⬜ Planned

**Goal:** Turn operational data into useful business information.

### Phase 7A — KPI & Metric Definitions

**Status:** ⬜ Planned

Before coding, formally define calculations for:

- Sales
- Order counts
- Low-stock products
- Top products
- Recent transactions
- Outstanding invoices

Metrics must be explicit and unambiguous.

### Phase 7B — Dashboard Backend Queries

**Status:** ⬜ Planned

Create appropriate business/data services and aggregation queries. Prioritize
correctness before optimization.

### Phase 7C — Dashboard Frontend

**Status:** ⬜ Planned

- KPI cards
- Sales overview
- Low-stock section
- Top products
- Recent activity and orders
- Outstanding invoices

### Phase 7D — Date Filtering & Query Performance

**Status:** ⬜ Planned

- Date filters
- Query review
- Appropriate indexes when evidence demonstrates a need

Do not add caching infrastructure prematurely.

### Phase 7E — Dashboard Verification

**Status:** ⬜ Planned

Validate every metric against known database data and its approved definition.

### Definition of Done

Users can view reliable business KPIs derived from SMEFlow operational data.

---

## Phase 8 — AI Business Assistant

**Status:** ⬜ Planned

**Goal:** Add AI only after reliable, structured business data exists.

AI Version 1 must remain read-only. The LLM must never execute arbitrary
generated SQL.

### Phase 8A — AI Architecture & Safety Design

**Status:** ⬜ Planned

Define:

- Allowed questions
- Approved backend tools and functions
- Authorization boundaries
- Data-access rules
- Response structure
- Failure behavior

### Phase 8B — Business Query Tool Layer

**Status:** ⬜ Planned

Create approved backend functions for questions such as:

- Top-selling products
- Low-stock products
- Sales totals
- Customer ranking
- Outstanding invoices
- Reorder suggestions

The backend remains responsible for database access and authorization.

### Phase 8C — LLM Integration

**Status:** ⬜ Planned

Integrate the selected LLM API through the approved tool/query architecture and
keep provider-specific logic appropriately isolated.

### Phase 8D — AI Assistant Frontend

**Status:** ⬜ Planned

Create the read-only AI business-assistant chat experience.

### Phase 8E — Explanation, Sources & Failure Handling

**Status:** ⬜ Planned

Where useful, show:

- Metrics used
- Date range
- Structured source information
- Uncertainty and failure states

### Phase 8F — AI Authorization & Safety Verification

**Status:** ⬜ Planned

Test:

- Company isolation
- Unsupported questions
- LLM API failures
- Malformed model output
- Prompt attempts to access unauthorized data

### Definition of Done

A company user can ask approved natural-language questions about their own
business data and receive useful read-only answers without bypassing application
authorization.

---

## Phase 9 — Production Quality

**Status:** ⬜ Planned

**Goal:** Improve reliability, security, maintainability, demo quality, and
engineering maturity.

### Phase 9A — Automated Testing Review

**Status:** ⬜ Planned

Review test gaps and strengthen:

- Unit tests
- Integration tests
- Critical end-to-end flows

Testing is not postponed until Phase 9. Each earlier phase must include tests for
the business rules it introduces; this milestone reviews and expands coverage.

### Phase 9B — Error Handling & Logging

**Status:** ⬜ Planned

Review:

- Consistent API errors
- Production-safe logging
- Unexpected failures
- Request or operation observability where appropriate

Avoid excessive infrastructure.

### Phase 9C — Demo Seed Data

**Status:** ⬜ Planned

Create safe, fictional demo data and an intentional seed strategy. Never use real
customer personal information.

### Phase 9D — Security Review

**Status:** ⬜ Planned

Review:

- Authentication
- Authorization
- Company isolation
- Secret handling
- Input validation
- Dependency vulnerabilities
- Common web and API security risks

### Phase 9E — UX & Responsive Polish

**Status:** ⬜ Planned

Improve:

- Loading states
- Empty states
- Error states
- Forms
- Responsive layout
- Usability consistency

### Phase 9F — CI Pipeline

**Status:** ⬜ Planned

Add an appropriate GitHub CI workflow for relevant checks such as:

- Install
- Lint
- Typecheck
- Tests
- Build

Do not introduce unnecessary DevOps complexity.

### Definition of Done

The application passes the agreed quality, security, testing, and usability
checks required for deployment and portfolio demonstration.

---

## Phase 10 — Deployment and Portfolio Presentation

**Status:** ⬜ Planned

**Goal:** Deploy SMEFlow and make it easy for recruiters and interviewers to
understand and evaluate.

### Phase 10A — Production PostgreSQL

**Status:** ⬜ Planned

- Select an appropriate low-cost managed PostgreSQL provider based on the options
  available at deployment time
- Do not assume the originally suggested provider remains the best choice
- Configure the production database securely

### Phase 10B — Backend Deployment

**Status:** ⬜ Planned

Deploy the Express API and configure:

- Environment variables
- CORS
- Database connection
- Production startup
- Health verification

### Phase 10C — Frontend Deployment

**Status:** ⬜ Planned

Deploy the React frontend and configure the production API URL correctly.

### Phase 10D — Production Migration & Demo Data

**Status:** ⬜ Planned

- Run approved production migrations safely
- Add fictional demo data where appropriate
- Never expose secrets

### Phase 10E — Production End-to-End Verification

**Status:** ⬜ Planned

Verify:

```text
React
→ production API
→ Prisma
→ production PostgreSQL
```

Also verify the major business workflows in the production environment.

### Phase 10F — Portfolio Presentation

**Status:** ⬜ Planned

- Polished README
- Screenshots
- Architecture diagram
- Entity-relationship diagram
- Demo account or instructions where appropriate
- Demo video
- Feature overview
- Engineering decisions
- Testing overview
- Deployment architecture
- Portfolio-site link

### Definition of Done

A recruiter can open the project, understand its architecture and business
problem, use or view a working deployment, and evaluate the engineering decisions
without needing local setup.

---

## Cross-Phase Development Rules

1. Complete phases in order unless the user explicitly changes the priority.
2. Work on one sub-milestone at a time.
3. Do not implement a later sub-milestone merely because it is convenient.
4. Design important business and database domains before implementing them.
5. Create migrations only from reviewed domain designs.
6. Add tests during the phase that introduces the relevant business rules.
7. Phase 9 expands quality coverage; it does not postpone testing until Phase 9.
8. AI remains Phase 8 and must not be introduced earlier.
9. Deployment remains Phase 10 unless temporary deployment is explicitly
   required earlier.
10. Keep documentation synchronized with implementation.

## Milestone Completion Rules

A milestone may be marked completed only after its relevant verification passes.
Writing code or documentation alone does not establish completion.

Depending on the milestone, verification may include:

- Lint
- Typecheck
- Build
- Unit tests
- Integration tests
- Prisma schema validation
- Prisma Client generation
- Migration verification
- API behavior
- Frontend behavior
- Database-integrity checks
- Company-isolation and security checks

After a milestone is successfully verified, update the README Current Status,
the development log, and the `AGENTS.md` Current Development Stage where
appropriate.
