# 03 — System Architecture

## Architecture Style

SMEFlow AI will initially use a modular monolith.

This is intentional.

A microservice architecture would add unnecessary infrastructure complexity for the first version. A well-structured modular monolith is easier to develop, test and deploy while still demonstrating good engineering practices.

## High-Level Architecture

```text
┌─────────────────────────────┐
│        React Web App        │
│   TypeScript + Tailwind     │
└──────────────┬──────────────┘
               │ HTTPS / JSON
               ▼
┌─────────────────────────────┐
│     Express REST API        │
│        TypeScript           │
│                             │
│ Auth                        │
│ Products                    │
│ Inventory                   │
│ Customers                   │
│ Suppliers                   │
│ Quotations                  │
│ Sales                       │
│ Purchasing                  │
│ Invoices                    │
│ Dashboard                   │
│ AI                          │
└──────────────┬──────────────┘
               │ Prisma ORM
               ▼
┌─────────────────────────────┐
│         PostgreSQL          │
└─────────────────────────────┘

               +
               │
               ▼
┌─────────────────────────────┐
│         LLM API             │
│  Business Q&A / Insights    │
└─────────────────────────────┘
```

## Backend Layering

Each module should approximately follow:

```text
route
  ↓
controller
  ↓
service
  ↓
repository / prisma
  ↓
database
```

### Route

Defines URL and middleware.

### Controller

Handles HTTP request and response.

### Service

Contains business logic.

Examples:

- Validate whether a quotation can be converted
- Calculate totals
- Determine whether stock is sufficient
- Receive purchase order
- Create stock movement

### Repository / Prisma

Handles database access.

## Suggested Backend Modules

```text
src/
├── config/
├── middleware/
├── modules/
│   ├── auth/
│   ├── companies/
│   ├── products/
│   ├── inventory/
│   ├── customers/
│   ├── suppliers/
│   ├── quotations/
│   ├── sales-orders/
│   ├── purchase-orders/
│   ├── invoices/
│   ├── dashboard/
│   └── ai/
├── shared/
├── app.ts
└── server.ts
```

## Frontend Structure

```text
src/
├── api/
├── components/
├── features/
│   ├── auth/
│   ├── products/
│   ├── inventory/
│   ├── customers/
│   ├── suppliers/
│   ├── quotations/
│   ├── sales/
│   ├── purchasing/
│   ├── invoices/
│   ├── dashboard/
│   └── ai/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── types/
└── main.tsx
```

## Key Architecture Decision

Inventory quantity should not be changed arbitrarily by frontend code.

Inventory changes must be caused by backend business operations such as:

- Purchase order receipt
- Sales order fulfilment
- Manual stock adjustment

Each change should create an inventory movement record.

This provides traceability and demonstrates real business-system design.

## Current Phase 3 Operational Architecture

The implemented Product and Inventory subsystem follows the modular-monolith
boundary described above:

```text
authenticated React route
  -> typed native-fetch API client
  -> authenticated Express route and role guard
  -> controller with strict Zod boundary
  -> Category, Product, or Inventory service
  -> Prisma transaction/query
  -> PostgreSQL constraints and tenant-aware relationships
```

All Company scope comes from the database-revalidated authentication context;
the client cannot choose `companyId`. Product CRUD manages master data only and
cannot write `quantityOnHand`. Controlled inventory commands use Prisma Decimal
operations inside one interactive transaction to update stock and insert one
immutable movement. PostgreSQL row locking and a conditional stock predicate
prevent competing stock-outs from overselling. Product search and the active
`quantityOnHand <= reorderLevel` rule execute in PostgreSQL, while the frontend
uses backend-authoritative refetches after stock changes.
