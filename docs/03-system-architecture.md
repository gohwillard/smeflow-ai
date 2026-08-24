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

## Phase 4 Customer and Supplier Boundary

Phase 4 keeps Customer and Supplier as separate modules inside the existing
modular monolith:

```text
authenticated Customer/Supplier route
  -> role guard and strict Zod boundary
  -> Customer or Supplier service
  -> Company-scoped Prisma query
  -> PostgreSQL tenant and lifecycle constraints
```

Both implemented backend modules derive ownership only from the
database-revalidated `req.auth.companyId`. A client-provided Company ID is never
an ownership input,
and cross-Company identifiers must be indistinguishable from tenant-local
missing identifiers. `OWNER` and `ADMIN` manage records; `STAFF` reads them
through the Phase 4C APIs. Archive/reactivate behavior preserves master
data instead of hard-deleting it. Phase 4D supplies the protected responsive
frontend presentation. Phase 4E keeps discovery backend-authoritative: the
typed native-fetch client sends only approved search/status parameters, the
strict controller boundary validates them, and Prisma combines PostgreSQL
substring/status predicates with `req.auth.companyId`. Lifecycle actions
refetch the current filters instead of calculating list membership in React.

Customer and Supplier are intentionally not combined into a generic business
partner abstraction. Their future Purchasing and Sales relationships differ,
and the MVP does not need shared multi-role lifecycle complexity. Future
transaction documents must keep the relevant foreign key while snapshotting
mutable party identity/contact/address values when their own domain design
requires historical document accuracy. No transactional model or snapshot
field is introduced during Phase 4A.
