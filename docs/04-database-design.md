# 04 — Database Design

## Design Principles

1. Use PostgreSQL and Prisma.
2. Use PostgreSQL-native UUIDs consistently for domain entity identifiers.
3. Use foreign keys to preserve relational integrity.
4. Avoid duplicated ownership and derived data unless there is a clear integrity
   or performance reason.
5. Track creation and update timestamps using timezone-aware values.
6. Keep inventory changes traceable through inventory movements.
7. Treat `Company` as the business-data ownership boundary.

## Design Status and Scope

Phase 2A approves only the `Company`, `User`, and `UserRole` design documented
below. It is a documentation-only milestone: no Prisma models or migrations are
part of this phase.

The later-domain models listed near the end of this document remain planning
context only. Their fields, relationships, constraints, and indexes are not
approved implementation specifications and must be designed in their canonical
roadmap milestones before implementation.

Phase 2B subsequently implemented this approved design in Prisma schema and
migration `20260818020913_init_company_user`.

## Approved Phase 2A Design

### `Company`

PostgreSQL table name: `companies`

| Field | Conceptual type | Required | Design rule |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key; generated automatically as a UUID v4 value and stored using PostgreSQL's native `uuid` type. |
| `name` | String | Yes | Company display/legal name. Input rules will be defined with the company API. |
| `registrationNumber` | String | No | Optional business registration identifier; no uniqueness rule is approved yet. |
| `email` | String | No | Optional company contact email; it is not the user's login identity and is not unique in Phase 2A. |
| `phone` | String | No | Optional company contact number. |
| `address` | String | No | Optional company address. A structured address is not needed for the MVP foundation. |
| `createdAt` | Timestamp with time zone | Yes | Set when the row is created. |
| `updatedAt` | Timestamp with time zone | Yes | Set when created and maintained whenever the row is updated. |

`Company` is SMEFlow's tenant-like business-data ownership boundary. It is not
an authentication account itself.

### `User`

PostgreSQL table name: `users`

| Field | Conceptual type | Required | Design rule |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key; generated automatically as a UUID v4 value and stored using PostgreSQL's native `uuid` type. |
| `companyId` | UUID | Yes | Foreign key to `companies.id`; a user cannot exist without a company. |
| `email` | String | Yes | Globally unique login identity for the MVP. Store the trimmed, lowercase canonical form and apply uniqueness to that stored value. |
| `passwordHash` | String | Yes | Stores only a one-way password hash. Plaintext or reversibly encrypted passwords are forbidden. |
| `firstName` | String | Yes | User's first name. |
| `lastName` | String | Yes | User's last name. |
| `role` | `UserRole` | Yes | Company-level role: `OWNER`, `ADMIN`, or `STAFF`. |
| `isActive` | Boolean | Yes | Controls whether the account may authenticate; defaults to `true` when created. |
| `createdAt` | Timestamp with time zone | Yes | Set when the row is created. |
| `updatedAt` | Timestamp with time zone | Yes | Set when created and maintained whenever the row is updated. |

The API must never return `passwordHash`. Password hashing behavior belongs to
Phase 2C, not this design milestone.

### `UserRole`

`UserRole` is a closed enum with these values:

- `OWNER` — the company's primary owner role.
- `ADMIN` — a company administrator role.
- `STAFF` — a regular company user role.

The enum establishes stable role names, but does not yet define every permission.
Authorization behavior belongs to later Phase 2 milestones.

### Relationship

```text
Company 1 ─── 0..* User
User    * ─── 1    Company
```

- One company may have many users.
- Every user belongs to exactly one company in the MVP.
- The foreign key is required; an orphaned user is invalid.
- A company may temporarily have no users at the database level because the
  database will not enforce owner lifecycle cardinality. Registration will later
  create a company and its initial `OWNER` atomically in backend business logic.
- Multi-company accounts and a `CompanyMembership` join model are intentionally
  outside the MVP design.

### Constraints, Indexes, and Naming

- `companies.id` and `users.id` are UUID primary keys.
- `users.companyId` is a required foreign key to `companies.id`.
- `users.email` has a global unique constraint for the current MVP login model.
- User emails are trimmed and lowercased before storage and lookup so uniqueness
  and authentication are case-insensitive without adding a PostgreSQL extension.
- `users.companyId` has an explicit non-unique index to support company-scoped
  user queries.
- Required fields are non-null; optional company contact fields are nullable.
- `isActive` defaults to `true`.
- Timestamps use timezone-aware PostgreSQL values and are handled consistently
  as UTC by the application.
- PostgreSQL table names are plural lowercase names: `companies` and `users`.
- Deleting a company must not silently cascade-delete users or future business
  records. Company deletion is not an MVP operation; the Phase 2B foreign key
  should preserve this conservative behavior.
- Phase 2A does not add a database constraint for exactly one `OWNER` per
  company. Owner lifecycle rules will be enforced later by backend business logic.

### Company Data-Isolation Strategy

`Company` is the ownership boundary for business data:

1. The authenticated user determines the active `companyId`; clients must not be
   trusted to choose an arbitrary company scope.
2. Future top-level business entities will generally store a required
   `companyId` and be queried within that company scope.
3. Child records should not automatically duplicate `companyId` when ownership
   can be safely derived through a required parent relationship.
4. Each future domain design must still verify that its relationships cannot
   connect records owned by different companies.
5. Database ownership fields support isolation, but backend authorization remains
   mandatory. Enforcement is implemented and tested in Phase 2E.

## Relational and Security Review

The approved one-company-per-user relationship is appropriate for the MVP and
avoids a premature membership abstraction. Required UUID primary and foreign
keys, a global user-email constraint, and the company index provide a sound first
domain foundation.

One ambiguity required clarification: PostgreSQL text uniqueness is
case-sensitive by default. Without canonicalization, differently cased versions
of the same email could become separate login identities. The approved design
therefore stores and looks up a trimmed, lowercase email while retaining the
requested global uniqueness rule.

No other blocking relational or security issue was identified. The design keeps
password material limited to a non-returned hash and avoids unsafe cascading
company deletion.

## Phase 2B Implementation Details

- Domain IDs use Prisma's `@default(uuid())` UUID v4 generation and PostgreSQL's
  native `uuid` columns through `@db.Uuid`. UUID values are therefore supplied
  by Prisma rather than a PostgreSQL column default.
- `createdAt` and `updatedAt` use `@db.Timestamptz(3)`. `createdAt` has
  `@default(now())`, while Prisma maintains `updatedAt` through `@updatedAt`.
- `User.companyId` is a required native UUID foreign key. The relation uses
  `onDelete: Restrict` so a company with users cannot be silently deleted; Prisma
  generated `ON UPDATE CASCADE` for referenced ID updates.
- The database tables are mapped to `companies` and `users`. The migration also
  creates the global unique user-email index and explicit non-unique
  `companyId` index approved in Phase 2A.
- The first migration is `20260818020913_init_company_user` and contains no
  authentication endpoints, password-hashing behavior, or later-domain models.

## Future Planned Models — Not Approved by Phase 2A

These models belong to later roadmap design milestones and must not be inferred
as ready for Prisma implementation from this list:

- Phase 3A: `Category`, `Product`, `InventoryMovement`
- Phase 4A: `Customer`, `Supplier`
- Phase 5A: `PurchaseOrder`, `PurchaseOrderItem`
- Phase 6A: `Quotation`, `QuotationItem`, `SalesOrder`, `SalesOrderItem`, `Invoice`

Future top-level models will generally belong to a company. Line items and other
child models should derive company ownership from their required parent when that
relationship can enforce isolation safely.

## Decisions Intentionally Deferred

- Password-hashing algorithm and parameters, registration validation, and
  transactional creation of a company with its initial owner (Phase 2C).
- Login credential verification and JWT design (Phase 2D).
- Authentication middleware, permission behavior for each role, and tested
  company isolation (Phase 2E).
- Company profile field validation and update rules (Phase 2F).
- Owner transfer, preventing removal or deactivation of the last owner, and any
  future rule for multiple owners.
- User invitation, email change, email verification, password reset, sessions,
  and account recovery.
- Company and user deletion, archival, retention, and audit-history policies.
- Uniqueness and formatting rules for company registration numbers because they
  may depend on jurisdiction.
- Maximum field lengths and structured company addresses.
- Multi-company users and `CompanyMembership`.

## Possible Post-MVP Improvements

- Product units
- Multiple warehouses
- Customer credit limits
- Payment records
- Audit logs
- More granular role-based permissions
- Soft deletion
- Tax configuration
