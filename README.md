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
- [ ] Authentication implemented
- [ ] Inventory module implemented
- [ ] Sales workflow implemented
- [ ] AI assistant implemented
- [ ] Production deployment completed

Completed phases: Phase 0 — Repository and Planning and Phase 1 — Application Foundation. Phase 2 — Authentication and Company Setup is in progress.

Completed milestone: Phase 2B — First Prisma Schema & Migration. The approved
`Company`, `User`, and `UserRole` design is implemented with PostgreSQL-native
UUIDs, timezone-aware timestamps, required company ownership, and migration
`20260818020913_init_company_user`.

Next milestone: Phase 2C — Registration & Password Security.

## Local Development

Complete the one-time setup from the repository root:

```bash
nvm use
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Replace the placeholder values in `apps/api/.env` with the local PostgreSQL
configuration. Keep both local `.env` files untracked.

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
