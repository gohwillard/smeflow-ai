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
7. Every major milestone should be deployed and demonstrable.

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
- [x] Frontend scaffolded
- [x] Backend scaffolded
- [x] Frontend ↔ backend connection established
- [x] PostgreSQL and Prisma connected
- [ ] Authentication implemented
- [ ] Inventory module implemented
- [ ] Sales workflow implemented
- [ ] AI assistant implemented
- [ ] Production deployment completed

Current development milestone: Phase 1C — PostgreSQL + Prisma Database Foundation is complete.

Next milestone: Phase 1D — Full-stack Foundation Verification.

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
