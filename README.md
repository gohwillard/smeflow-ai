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
- [ ] Inventory module implemented
- [ ] Sales workflow implemented
- [ ] AI assistant implemented
- [ ] Production deployment completed

Completed phases: Phase 0 — Repository and Planning, Phase 1 — Application
Foundation, and Phase 2 — Authentication and Company Setup.

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

Phase 3 — Product and Inventory Module is in progress. Phase 3A — Product &
Inventory Domain Design and Phase 3B — Product & Inventory Schema Migration are
complete. Prisma and PostgreSQL now contain the approved `Category`, `Product`,
`InventoryMovement`, and `InventoryMovementType` structures, tenant-aware
foreign keys, exact decimal types, business uniqueness rules, indexes, and
database checks through migration `20260819112747_add_product_inventory`.
Phase 3C — Category & Product Backend has not started and requires explicit
instruction after review of Phase 3B.

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
