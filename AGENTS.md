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

Examples:

PURCHASE_RECEIPT
SALE
ADJUSTMENT_IN
ADJUSTMENT_OUT

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

Phase 2 — Authentication and Company Setup is in progress.

Phase 2A — Company & User Domain Database Design is complete. It approved the `Company`, `User`, and `UserRole` design, the one-company-per-user MVP relationship, UUID and timestamp strategies, globally unique normalized user email, the company ownership boundary, and required constraints and indexes. Phase 2A changed documentation only; no Prisma models or migration were created.

The next milestone is Phase 2B — First Prisma Schema & Migration. Implement only the reviewed Phase 2A design in that milestone; do not implement registration, authentication, later business modules, or AI.
