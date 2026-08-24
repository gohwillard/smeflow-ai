# SMEFlow AI

AI-powered business management system for small and medium enterprises (SMEs).

## Project Goal

SMEFlow AI is a portfolio project designed to demonstrate practical full-stack engineering and business-system thinking.

The system will help an SME manage:

- Products and inventory
- Customers and suppliers
- Quotations
- Sales orders
- Purchase orders
- Invoices
- Business dashboard and KPIs
- AI-assisted business queries and recommendations

The project is intentionally designed as a realistic business system rather than a simple CRUD demo.

## Planned Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication

### Testing
- Vitest
- React Testing Library
- Supertest

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: PostgreSQL on Render or another managed PostgreSQL provider

### AI
- LLM API integration after the core business modules are stable
- Business Q&A using structured application data
- Recommendation and insight generation

## Repository Structure

```text
smeflow-ai/
├── apps/
│   ├── web/                  # React frontend
│   └── api/                  # Node.js / Express backend
├── packages/
│   └── shared/               # Shared types/constants
├── docs/
│   ├── 01-product-overview.md
│   ├── 02-requirements.md
│   ├── 03-system-architecture.md
│   ├── 04-database-design.md
│   ├── 05-api-plan.md
│   ├── 06-development-roadmap.md
│   ├── 07-testing-strategy.md
│   └── 08-deployment-plan.md
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Development Principles

1. Build the core business workflow before adding AI.
2. Every important business rule should exist in the backend.
3. Database changes should be managed using migrations.
4. APIs should have clear validation and error handling.
5. Important features should include tests.
6. Documentation should be updated alongside implementation.
7. Every milestone should pass its relevant verification and remain demonstrable.

## MVP Business Flow

```text
Supplier
   ↓
Purchase Order
   ↓
Stock In
   ↓
Inventory
   ↓
Quotation
   ↓
Sales Order
   ↓
Invoice
   ↓
Dashboard / AI Insights
```

## Current Status

- [x] Project concept defined
- [x] Initial architecture decided
- [x] Documentation skeleton created
- [x] GitHub repository created
- [x] Monorepo initialized
- [x] Phase 1 application foundation complete
- [x] Frontend scaffolded
- [x] Backend scaffolded
- [x] Frontend ↔ backend connection established
- [x] PostgreSQL and Prisma connected
- [x] Phase 2A Company and User domain design approved
- [x] Phase 2B Company and User Prisma schema and first migration complete
- [x] Phase 2C registration and password security complete
- [x] Phase 2D login and JWT authentication complete
- [x] Phase 2E authentication middleware and company isolation complete
- [x] Phase 2F company profile API complete
- [x] Phase 2G protected frontend authentication flow complete
- [x] Phase 2H full Phase 2 verification complete
- [x] Authentication implemented
- [x] Phase 3 officially started
- [x] Phase 3A Product and Inventory domain design approved
- [x] Phase 3B Product and Inventory schema migration complete
- [x] Phase 3C Category and Product backend complete
- [x] Phase 3D Product frontend complete
- [x] Phase 3E Inventory Movement and Manual Adjustment complete
- [x] Phase 3F Product Search and Low Stock complete
- [x] Phase 3G final verification complete
- [x] Phase 3 Product and Inventory Module complete
- [x] Inventory module implemented
- [x] Phase 4 Customers and Suppliers officially started
- [x] Phase 4A Customer and Supplier domain design approved
- [x] Phase 4B Customer and Supplier schema migration complete
- [ ] Phase 4C Customer and Supplier backend implemented and awaiting manual approval
- [ ] Sales workflow implemented
- [ ] AI assistant implemented
- [ ] Production deployment completed

Completed phases: Phase 0 — Repository and Planning, Phase 1 — Application
Foundation, Phase 2 — Authentication and Company Setup, and Phase 3 — Product
and Inventory Module.

Completed milestone: Phase 2H — Phase 2 Verification. The final audit confirmed
the approved Company/User schema and migration, secure registration and login,
fixed-algorithm JWT handling, database-revalidated Bearer authentication,
Company isolation, role-authorized Company Profile access, and the complete
protected frontend flow. All 66 backend tests and 24 frontend tests passed.
Frontend lint/build, backend typecheck/build, Prisma validation/generation,
migration status, schema-drift inspection, live browser E2E, security review,
visual review, and test-data cleanup also passed. No Phase 2 defect, application
code change, dependency change, Prisma schema change, or migration was needed.

The access token remains intentionally limited to React application memory. A
reload or address-bar navigation recreates the SPA, clears authentication, and
returns the user to login; no token is stored in Web Storage, IndexedDB,
cookies, or URLs.

Phase 3 — Product and Inventory Module is complete. Phase 3A — Product &
Inventory Domain Design and Phase 3B — Product & Inventory Schema Migration are
complete. Prisma and PostgreSQL now contain the approved `Category`, `Product`,
`InventoryMovement`, and `InventoryMovementType` structures, tenant-aware
foreign keys, exact decimal types, business uniqueness rules, indexes, and
database checks through migration `20260819112747_add_product_inventory`.
Phase 3C — Category & Product Backend is complete after manual API verification.
Phase 3D — Product Frontend is complete after manual browser approval. Protected
Product list, create, detail, and edit routes plus Category management now use
the Phase 3C APIs. OWNER and ADMIN receive lifecycle-management controls, STAFF
remains read-only, archived Category relationships remain visible, decimal
values stay strings, Product units are backend-normalized to uppercase, and
`quantityOnHand` is display-only. The Product list now uses an aligned desktop
table and stacked mobile cards, and all Product/Category archive and reactivate
actions use a reusable accessible confirmation dialog. Its regression coverage
remains verified.

Phase 3E — Inventory Movement & Manual Adjustment is complete after
user/ChatGPT manual API and browser approval.
Authenticated Product-scoped history is immutable, Company-isolated,
newest-first, and available to all three roles. OWNER and ADMIN can perform
controlled Opening Balance, Stock In, and Stock Out operations; STAFF remains
read-only. Each successful operation uses exact decimal-string input, an atomic
conditional Product update and InventoryMovement insert in one
Prisma/PostgreSQL transaction, and backend-derived Company, creator, and
before/after balances. Archived Products remain historically readable but
cannot be adjusted. The Product detail UI now includes loading, empty, error,
and populated history states plus an accessible role-aware adjustment dialog.
All 176 backend tests and 88 frontend tests pass, including real concurrent
stock-out and forced rollback regressions, together with frontend lint/build,
backend typecheck/build, Prisma validation/generation/status, and
1440×1000/390×844 visual review. No schema or migration changed.

Phase 3F — Product Search & Low Stock is complete after user/ChatGPT manual API
and browser approval.
The existing authenticated `GET /api/v1/products` endpoint now strictly accepts
optional `search` and `lowStock=true` query parameters. SKU/name search is
trimmed, case-insensitive, substring-based, and Company-scoped. Low-stock
filtering is enforced by PostgreSQL through Prisma's typed column reference as
`isActive = true AND quantityOnHand <= reorderLevel`, including the approved
zero/zero case and excluding archived Products. The responsive Product list now
provides explicit search, clear/reset, a low-stock-only control, distinct
filtered empty states, and restrained warning badges without replacing Product
lifecycle status. All 207 backend tests and 106 frontend tests pass, together
with backend typecheck/build, frontend ESLint/build, Prisma
validation/generation/migration status, and 1440×1000/390×844 visual review. No
dependency, schema, migration, pagination, reorder automation, notification,
Dashboard, or AI work was added.

Phase 3G — Phase 3 Final Verification is complete following the final
user/ChatGPT acceptance check. The
complete Category, Product, Inventory, search, and low-stock subsystem passed
scope, live PostgreSQL catalog, migration/drift, role, Company-isolation,
strict-validation, exact-Decimal, transaction, concurrency, error-safety,
authentication-regression, accessibility, responsive, and production-readiness
review. A disposable real-API/two-Company scenario re-proved the full approved
stock sequence, Opening Balance rules, failed-operation rollback, search cases,
low-stock cases, combined filters, filtered stock-refresh behavior, STAFF
restrictions, and tenant-local failures, then removed all fictional records.
All 207 backend tests across 8 files and 106 frontend tests across 5 files pass,
along with backend typecheck/build, frontend lint/build, Prisma
validation/generation/migration status, two no-drift comparisons, and visual
review at 1440×1000, 430×932, and 390×844. No application defect, dependency,
schema, migration, or new business feature was introduced during verification.

Phase 4 — Customers and Suppliers is current. Phase 4A — Customer & Supplier
Domain Design is complete and approved. Phase 4B — Customer & Supplier Schema
Migration is complete. Phase 4C — Customer & Supplier Backend is implemented and
Codex-verified, awaiting manual API/database approval. Authenticated list,
detail, create, partial-update, idempotent archive, and explicit reactivation
routes enforce strict normalization, safe response selection, OWNER/ADMIN
writes, STAFF reads, and database-validated Company scope. All 316 backend tests
across 10 files pass, together with backend typecheck/build and Prisma
validation/generation/migration status. Exactly three migrations remain and the
schema is up to date. No frontend, search, pagination, Purchasing, Sales,
Dashboard, or AI work was added; Phase 4D and Phase 5 have not started.

## Local Development

Complete the one-time setup from the repository root:

```bash
nvm use
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Replace the placeholder values in `apps/api/.env` with the local PostgreSQL
and JWT configuration. Generate a random `JWT_SECRET` containing at least 32
bytes; never reuse the empty example value. Keep both local `.env` files
untracked.

For normal development, start the backend from one terminal:

```bash
cd path/to/smeflow-ai
nvm use
npm run dev:api
```

Then start the frontend from a second terminal:

```bash
cd path/to/smeflow-ai
nvm use
npm run dev:web
```

Open `http://localhost:5173`. The backend health endpoint is available at
`http://localhost:4000/api/v1/health`.

## Portfolio Outcome

The final project should allow a recruiter or engineering manager to quickly see:

- Full-stack development ability
- Relational database design
- API design
- Business logic implementation
- Authentication and authorization
- Testing
- Architecture decisions
- Git workflow
- Deployment
- AI integration
- Product and business understanding
