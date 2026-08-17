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

Development order:

1. Repository and documentation
2. Frontend/backend foundation
3. PostgreSQL + Prisma
4. Authentication
5. Product + Inventory
6. Customer + Supplier
7. Purchasing workflow
8. Sales workflow
9. Dashboard
10. AI Assistant
11. Testing
12. Deployment

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

Phase 1D — Full-stack Foundation Verification is complete. Phase 1 application foundation is complete.

The React frontend calls the Express health endpoint, and the Express backend verifies its local PostgreSQL connection through Prisma ORM 7. The complete browser-to-database development flow has been verified.

Node.js 22 should be used for this project.

The next goal is Phase 2 — Database Design & First Domain Schema.

Do not implement authentication, later business modules or AI before completing the first domain schema milestone.
