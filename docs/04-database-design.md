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

Phase 2A approved the `Company`, `User`, and `UserRole` design documented below,
and Phase 2B implemented it in Prisma schema and migration
`20260818020913_init_company_user`.

Phase 3A approved the `Category`, `Product`, `InventoryMovement`, and
`InventoryMovementType` design documented below. Phase 3B implemented that
design in Prisma schema and migration
`20260819112747_add_product_inventory`, including customized PostgreSQL SQL for
the expression index and check constraints that Prisma Schema Language cannot
represent. Phase 3C consumes this approved schema through authenticated,
tenant-scoped Category and Product APIs. Phase 3E now consumes the existing
movement model through Product-scoped history and transactional manual-adjustment
operations. Phase 3F consumes the existing Product columns through authenticated
SKU/name search and a database-authoritative low-stock comparison. Phase 3G
verifies the complete integrated subsystem, live catalog, migration history,
and schema drift. None of these milestones changed the Phase 3B Prisma schema
or migrations.

Phase 3 is complete. Phase 4A's `Customer` and `Supplier` domain design is
approved. Phase 4B implemented and received approval for that design in Prisma
schema and migration `20260824025721_add_customer_supplier`. Phase 4C consumes
the unchanged schema through authenticated, Company-scoped Customer and
Supplier APIs; Phase 4D supplies their frontend; and Phase 4E uses the existing
columns for database-authoritative search and lifecycle filtering. No Phase 4E
schema, migration, extension, or specialized index was needed. Phase 4F uses
the already approved tenant-aware candidate keys as documented future
relationship groundwork and adds only truthful detail-page presentation; it
also requires no schema or migration change.

Models assigned to later roadmap phases remain planning context only. Their
fields, relationships, constraints, and indexes must be designed in their own
canonical milestones before implementation.

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

## Approved Phase 3A Product and Inventory Design

This section is the approved implementation specification used by Phase 3B.
Phase 3A defined the domain only; all runtime behavior described here belongs to
the later Phase 3 milestones named below.

### `Category`

PostgreSQL table name: `categories`

| Field | Conceptual type | Required | Design rule |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key; use the existing Prisma-generated UUID v4 and native PostgreSQL `uuid` convention. |
| `companyId` | UUID | Yes | Required owner and foreign key to `companies.id`; never accepted as client-selected scope. |
| `name` | String | Yes | Trim before storage and reject an empty result. Preserve user-facing casing, but enforce case-insensitive uniqueness within the Company. |
| `description` | String | No | Optional descriptive text; trim supplied text and store `null` rather than a blank-only value. |
| `isActive` | Boolean | Yes | Defaults to `true`; normal removal is deactivation, not hard deletion. |
| `createdAt` | Timestamp with time zone | Yes | Defaults when created, using `timestamptz(3)`. |
| `updatedAt` | Timestamp with time zone | Yes | Prisma-maintained using `@updatedAt` and `timestamptz(3)`. |

A Category belongs to exactly one Company, and a Company may have many
Categories. Different Companies may both have a Category displayed as
`Electrical`; one Company may not store case variants such as `Electrical`,
`electrical`, and `ELECTRICAL` as separate Categories.

The recommended Phase 3B database rule is a PostgreSQL functional unique index
on `("companyId", lower("name"))`, combined with a constraint that the stored
name is already trimmed and non-empty. This preserves useful display casing and
avoids a redundant normalization column whose value could become inconsistent.
Prisma does not currently express this functional index as an ordinary
`@@unique`, so Phase 3B must add and inspect the exact index in the migration SQL
and verify migration replay. The backend must still trim names and map database
uniqueness failures to a safe conflict response. A `citext` extension is not
needed for this single rule.

The uniqueness rule covers active and inactive rows. An archived Category keeps
its name reserved; normal behavior is to find and reactivate or rename that row,
not create a case-variant duplicate.

### `Product`

PostgreSQL table name: `products`

| Field | Conceptual type | Required | Design rule |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key using the established UUID convention. |
| `companyId` | UUID | Yes | Required Company owner; scope comes only from authenticated backend identity. |
| `categoryId` | UUID | No | Optional Category assignment. When present, the Category must belong to the same Company. |
| `sku` | String | Yes | Trim and uppercase before storage; non-empty and unique per Company across active and inactive Products. |
| `name` | String | Yes | Trim before storage and reject an empty result. Product names are not unique. |
| `description` | String | No | Optional; trim supplied text and store `null` rather than a blank-only value. |
| `unit` | String | Yes | Required simple Product-level label such as `pcs`, `box`, `meter`, `kg`, or `litre`; trim and reject an empty result. |
| `costPrice` | Decimal(12,2) | Yes | Exact non-negative monetary amount. |
| `sellingPrice` | Decimal(12,2) | Yes | Exact non-negative monetary amount. |
| `quantityOnHand` | Decimal(14,3) | Yes | Current stock balance; defaults to `0` and cannot be negative. Not writable through ordinary Product CRUD. |
| `reorderLevel` | Decimal(14,3) | Yes | Non-negative low-stock threshold; defaults to `0`. |
| `isActive` | Boolean | Yes | Defaults to `true`; normal removal is deactivation. |
| `createdAt` | Timestamp with time zone | Yes | Defaults when created, using `timestamptz(3)`. |
| `updatedAt` | Timestamp with time zone | Yes | Prisma-maintained using `@updatedAt` and `timestamptz(3)`. |

A Product belongs to exactly one Company and may belong to zero or one Category.
An assigned Category must be owned by that same Company. New assignment to an
inactive Category should be rejected by Phase 3C business logic, while existing
Product relationships remain intact if a Category is later archived.

SKU uniqueness is `UNIQUE (companyId, sku)` over every Product, including
inactive Products. The backend stores the canonical trimmed, uppercase form, so
`" drill-001 "`, `"Drill-001"`, and `"DRILL-001"` all become `DRILL-001`.
Different Companies may use the same canonical SKU. Archiving never releases an
SKU because historical records must continue to identify the original Product
unambiguously.

Money uses PostgreSQL exact `numeric(12,2)` through Prisma `Decimal` and
`@db.Decimal(12, 2)`. Binary floating-point values cannot exactly represent many
decimal monetary amounts and can introduce comparison or rounding errors.
Prices are required and constrained to `>= 0`; tax, discounts, price history,
supplier pricing, margin calculations, and costing methods are outside Phase 3.

Stock quantities use exact `numeric(14,3)` through Prisma `Decimal` and
`@db.Decimal(14, 3)`. Three fractional digits support stock such as `1.500`
meters, `2.250` kilograms, and `0.500` litres while also representing whole
pieces. `quantityOnHand` and `reorderLevel` are constrained to `>= 0` and default
to zero. Ordinary API inputs must reject values with more precision or magnitude
than the database representation rather than silently rounding them.

`unit` deliberately remains a required trimmed String. Phase 3C should apply a
sensible bounded input length and reject blank or control-character-only values,
but Phase 3A does not introduce a `UnitOfMeasure` table, conversion rules, base
units, or separate purchase and sales units.

The implemented Phase 3F low-stock rule is:

```text
isActive = true AND quantityOnHand <= reorderLevel
```

`reorderLevel = 0` is valid. Phase 3F expresses the exact column-to-column
comparison through Prisma's typed Product field reference, so PostgreSQL compares
the two `numeric(14,3)` values directly. The current MVP dataset and simple
substring behavior did not provide evidence for a new search or low-stock index,
so Phase 3F added none.

### `InventoryMovement`

PostgreSQL table name: `inventory_movements`

| Field | Conceptual type | Required | Design rule |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key using the established UUID convention. |
| `companyId` | UUID | Yes | Required Company owner and authoritative tenant scope copied from `req.auth.companyId`. |
| `productId` | UUID | Yes | Required Product in the same Company. |
| `createdByUserId` | UUID | Yes | User who performed the operation; that User must belong to the same Company. |
| `type` | `InventoryMovementType` | Yes | Determines whether stock increases or decreases. |
| `quantity` | Decimal(14,3) | Yes | Strictly positive magnitude; direction is never encoded with a negative number. |
| `quantityBefore` | Decimal(14,3) | Yes | Non-negative balance immediately before the operation. |
| `quantityAfter` | Decimal(14,3) | Yes | Non-negative balance immediately after the operation. |
| `note` | String | No | Optional human explanation; trim supplied text and store `null` rather than a blank-only value. |
| `createdAt` | Timestamp with time zone | Yes | Immutable creation time using `timestamptz(3)`; no `updatedAt` is needed. |

An InventoryMovement belongs to exactly one Company and Product and records
exactly one creating User. It is an immutable audit record: normal application
behavior provides no update or delete operation. A mistake is corrected with a
new compensating movement; the original row and its before/after values remain
unchanged.

For Phase 3, `InventoryMovementType` contains only:

- `OPENING_BALANCE` — deliberate initial stock increase after Product creation.
- `MANUAL_IN` — authorized manual stock increase.
- `MANUAL_OUT` — authorized manual stock decrease.

The enum can gain workflow-specific values in later schema migrations without
redesigning the model. Purchase receipt/return and sales fulfilment/return types
are deliberately deferred until their corresponding workflows exist.

Movement `quantity` is always `> 0`. `OPENING_BALANCE` and `MANUAL_IN` increase
stock, so `quantityAfter = quantityBefore + quantity`. `MANUAL_OUT` decreases
stock, so `quantityAfter = quantityBefore - quantity`. Both before and after
must remain `>= 0`. Phase 3B should encode the non-negative, positive-magnitude,
and type/direction arithmetic rules as database check constraints in migration
SQL, with Phase 3E backend validation providing clearer errors first.

Product creation always starts with `quantityOnHand = 0`; Product CRUD does not
accept opening quantity. If deliberate initial stock is needed, Phase 3E should
create the Product first and then apply an `OPENING_BALANCE` as the Product's
first movement from zero. The backend must reject an opening balance after any
movement already exists or when the Product balance is not zero. A zero opening
balance needs no movement because movement quantities are strictly positive.

### Current Balance and Traceable History Invariant

SMEFlow deliberately stores both forms of inventory data:

```text
Product.quantityOnHand  -> current balance for operational reads
InventoryMovement       -> complete reason-and-actor history of changes
```

`quantityOnHand` is not an arbitrary Product field. Product creation fixes it at
zero, and Product update validation must exclude it. The frontend must never
send an arbitrary stock overwrite. Every stock-changing operation must go
through backend inventory business logic and create exactly one corresponding
InventoryMovement.

Negative stock is forbidden. For example, `MANUAL_OUT 12` against a balance of
`10` must fail without changing either table. This is enforced by Phase 3E
business logic and by the database constraint `quantityOnHand >= 0` as a final
safety net.

### Transactional Integrity and Concurrent Updates

Every Phase 3E stock operation must execute the Product balance change and
InventoryMovement insert in one database transaction. If validation, update, or
movement creation fails, the complete operation rolls back. The system must
never commit a movement without its balance change or a balance change without
its movement.

The recommended Prisma/PostgreSQL approach is an interactive transaction whose
Product update is an atomic conditional update scoped by `id`,
`req.auth.companyId`, active status, and—when decreasing stock—
`quantityOnHand >= requested quantity`. Use an atomic Decimal increment or
decrement and require exactly one updated row, then read the resulting balance
and insert the movement before committing. The Product row lock acquired by the
update is held until commit; a competing stock-out must re-evaluate the
condition against the committed balance and fail if stock is no longer
sufficient. Before/after values can be derived exactly from the resulting
balance and requested magnitude.

Phase 3E must integration-test this with concurrent requests. If Prisma's exact
generated operations cannot preserve these semantics, an explicitly justified
PostgreSQL row-locking or serializable-transaction pattern with retry is the
fallback. A read-then-write sequence outside this transaction is invalid.

### Relationships and Tenant Isolation

```text
Company  1 -> 0..* Category
Company  1 -> 0..* Product
Company  1 -> 0..* InventoryMovement
Category 1 -> 0..* Product; Product -> 0..1 Category
Product  1 -> 0..* InventoryMovement
User     1 -> 0..* created InventoryMovement
```

Application isolation remains mandatory. Every Product/Inventory query and
mutation derives Company scope from the database-validated request context:

```text
req.auth = { userId, companyId, role }
```

No route, body, query, or frontend-selected `companyId` may choose or override
that scope. Frontend authorization is a UX aid, not the security boundary.

Phase 3B should also enforce tenant ownership in PostgreSQL rather than relying
only on UUID uniqueness and application filters:

- `Category` and `Product` retain their existing-style UUID primary key and add
  candidate keys on `(id, companyId)` for tenant-aware references.
- `User` keeps its Phase 2 primary key and gains a candidate key on
  `(id, companyId)`; this does not redesign authentication or membership.
- optional Product assignment uses `(categoryId, companyId)` ->
  `Category(id, companyId)`.
- InventoryMovement uses `(productId, companyId)` ->
  `Product(id, companyId)` and `(createdByUserId, companyId)` ->
  `User(id, companyId)`.
- each company-owned table also has its direct required Company foreign key.

The composite candidate keys create some intentional index overlap with globally
unique UUID primary keys, but they let ordinary foreign keys make all three
cross-company relationship examples impossible. This small cost is justified
for the central tenant boundary and is preferable to triggers or application-only
integrity. Phase 3B must validate the exact Prisma relation declarations before
generating its migration.

All Company, Category, Product, movement Product, and movement User foreign keys
should use the existing `ON DELETE RESTRICT` convention. Do not cascade-delete
historical business data. Category archival keeps Product links intact; Product
archival keeps its SKU and movements; User
deactivation keeps authorship; and Company deletion remains outside the MVP.

### Archive and Authorization Policy

Normal Category and Product lifecycle management uses `isActive` rather than
hard deletion. Archived Products remain available for history, retain their
SKU, and cannot normally participate in new transactions or manual adjustments.
Archived Categories stay related to existing Products and are omitted from new
active-category selections. Archiving a Category does not automatically archive
its Products.

Initial Phase 3 authorization is:

| Capability | OWNER | ADMIN | STAFF |
| --- | --- | --- | --- |
| View Categories and Products | Yes | Yes | Yes |
| Search/filter Products and view stock | Yes | Yes | Yes |
| Create/update/archive Categories | Yes | Yes | No |
| Create/update/archive Products | Yes | Yes | No |
| View appropriate inventory movement history | Yes | Yes | Yes |
| Perform manual stock adjustments | Yes | Yes | No |

All routes require authentication. Phase 3C and Phase 3E must enforce this in
the backend with the existing role guard or an equally focused policy; hiding UI
controls is not authorization. Archived rows remain company-scoped and do not
bypass role checks.

### Phase 3B Index Strategy

Indexes are limited to known ownership, uniqueness, relationship, and listing
patterns:

- Category: functional unique index on `(companyId, lower(name))`; tenant-aware
  candidate key `(id, companyId)`; non-unique `(companyId, isActive)` for active
  lists. No separate `companyId` index is needed because it is the leading part
  of other Category indexes.
- Product: unique `(companyId, sku)`; tenant-aware candidate key
  `(id, companyId)`; non-unique `(companyId, categoryId)` for category-filtered
  lists and `(companyId, isActive)` for lifecycle-filtered lists. No separate
  `companyId` index is needed.
- InventoryMovement: non-unique `(companyId, productId, createdAt)` for a
  tenant-scoped Product history. PostgreSQL can scan a normal ascending B-tree
  backward for newest-first results, so an explicit descending duplicate is not
  justified initially.
- User: retain the existing `companyId` index and add only the tenant-aware
  `(id, companyId)` candidate key required by the movement foreign key.

Broad Product search and low-stock expression indexes were reviewed in Phase 3F.
The implemented MVP queries do not yet justify an additional index; future
indexing must be based on measured query behavior. No index is added merely
because a field exists.

### Phase 3B Constraints

Phase 3B must verify these database constraints in addition to primary keys,
foreign keys, enum membership, nullability, defaults, and timestamps:

- case-insensitive `UNIQUE (companyId, lower(name))` for Category;
- `UNIQUE (companyId, sku)` for Product, including inactive rows;
- required Category name, Product SKU/name/unit stored non-empty and trimmed;
- Product SKU stored uppercase as well as trimmed;
- `costPrice >= 0` and `sellingPrice >= 0`;
- `quantityOnHand >= 0` and `reorderLevel >= 0`;
- InventoryMovement `quantity > 0`, `quantityBefore >= 0`, and
  `quantityAfter >= 0`;
- movement before/after arithmetic consistent with the movement type;
- defaults of zero for Product quantities and `true` for lifecycle flags;
- tenant-aware foreign keys preventing cross-company Category, Product, and
  User relationships.

Frontend validation supplies timely input feedback. Backend validation is
authoritative for allowed fields, normalization, authorization, Company scope,
activity, opening-balance rules, movement semantics, and stock availability.
Database constraints are the final integrity safety net. None of these layers
replaces the others.

### Phase 3B Implementation Details

- Migration `20260819112747_add_product_inventory` creates `categories`,
  `products`, `inventory_movements`, and the three-value
  `InventoryMovementType` enum without changing the Phase 2 migration.
- Prisma represents all approved models, native UUID/decimal/timestamp types,
  defaults, direct Company relations, composite candidate keys, tenant-aware
  composite relations, business uniqueness, and access-path indexes that its
  schema language supports.
- Customized migration SQL adds the per-Company functional unique index on
  `lower(Category.name)`; required-string normalization checks; non-negative
  Product price, stock, and reorder checks; positive/non-negative movement
  checks; and type-aware movement arithmetic. `OPENING_BALANCE` requires a zero
  before-balance and an after-balance equal to its quantity.
- Every Company, Category, Product, and movement-author foreign key uses
  `ON DELETE RESTRICT`. PostgreSQL verification confirmed the optional composite
  Product-to-Category foreign key permits `categoryId = NULL` while rejecting a
  Category from another Company.
- Migration replay, live-schema drift comparison, PostgreSQL catalog inspection,
  transactional constraint/isolation checks, Prisma validation and generation,
  and existing backend regressions passed. Transactional fictional verification
  records were rolled back.

### Explicit Phase 3 Exclusions

Phase 3A does not design or implement product variants, warehouses, multiple
stock locations, batch or serial tracking, barcodes, bundles, unit conversion,
stock reservation, inventory valuation, FIFO, LIFO, weighted-average costing,
tax engines, discounts, price history, supplier pricing, or margin calculation.
Purchasing and Sales will add their own movement types only with their approved
workflows. Customer, Supplier, Purchasing, Sales, Dashboard, and AI work remains
in its later canonical phases; AI V1 remains read-only and may not execute
arbitrary LLM-generated SQL.

## Approved Phase 4A Customer and Supplier Design

This section is the approved implementation specification used by Phase 4B and
the later Phase 4 API/frontend milestones. Phase 4A itself changed only
documentation.

### Domain Boundary and Separation

A `Customer` is a Company-owned external party to whom the Company may later
issue Quotations, Sales Orders, and Invoices. A `Supplier` is a separate
Company-owned external party from whom the Company may later purchase goods.
Both are master data: their contact details and lifecycle state may change over
time independently of transactional documents.

Customer and Supplier remain separate models because they serve different
workflows, have different address needs, and will gain different transaction
relationships. A real organization may be represented once in each model when
it genuinely plays both roles. Phase 4 does not introduce a polymorphic
`BusinessPartner`, partner-role table, shared-contact subsystem, or automatic
link between those two records. That abstraction would add joins, lifecycle
coordination, and role semantics without an approved MVP requirement.

No mandatory `customerCode` or `supplierCode` is approved. The canonical
requirements, API plan, and roadmap do not require such codes. UUIDs provide
internal identity, while names and contact information provide business-facing
identification. Auto-number sequencing is deferred to the document-numbering
designs in Purchasing and Sales.

### `Customer`

Planned PostgreSQL table name: `customers`

| Field | Conceptual type | Required | Maximum length | Design rule |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | — | Immutable primary key; use the existing Prisma-generated UUID v4 and native PostgreSQL `uuid` convention. |
| `companyId` | UUID | Yes | — | Immutable owner and required foreign key to `companies.id`; always derived from authenticated backend context. |
| `name` | String | Yes | 200 | Trim, reject an empty result, and preserve display casing. Not unique. |
| `registrationNumber` | String | No | 100 | Customer business-registration identifier where applicable; trim, blank to `null`, preserve meaningful formatting and casing, and do not apply jurisdiction-specific validation. |
| `contactPerson` | String | No | 200 | Primary MVP contact; trim and normalize blank to `null`. |
| `email` | String | No | 320 | Contact email; trim, lowercase, validate when present, and normalize blank to `null`. Not a login identity and not unique. |
| `phone` | String | No | 50 | Trim and normalize blank to `null`; store as text and preserve meaningful characters such as `+`, spaces, parentheses, and leading zeroes. |
| `billingAddress` | String | No | 2,000 | Primary billing/contact address; trim and normalize blank to `null`. |
| `shippingAddress` | String | No | 2,000 | Default shipping/delivery address; trim and normalize blank to `null`. It is only a future default, not historical document truth. |
| `notes` | String | No | 2,000 | Internal plain-text notes; trim and normalize blank to `null`. No CRM activity model or rich-text/HTML storage is introduced. |
| `isActive` | Boolean | Yes | — | Defaults to `true`; `false` means archived, not deleted. |
| `createdAt` | Timestamp with time zone | Yes | — | Defaults when created using the established `timestamptz(3)` convention. |
| `updatedAt` | Timestamp with time zone | Yes | — | Prisma-maintained using `@updatedAt` and `timestamptz(3)`. |

Customer has separate billing and shipping addresses because Sales commonly
needs both defaults. Phase 4 does not add multiple-address records, contact
lists, credit limits, tax profiles, payment terms, or customer-accounting data.

### `Supplier`

Planned PostgreSQL table name: `suppliers`

| Field | Conceptual type | Required | Maximum length | Design rule |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | — | Immutable primary key using the established UUID convention. |
| `companyId` | UUID | Yes | — | Immutable owner and required foreign key to `companies.id`; always derived from authenticated backend context. |
| `name` | String | Yes | 200 | Trim, reject an empty result, and preserve display casing. Not unique. |
| `registrationNumber` | String | No | 100 | Supplier business-registration identifier where applicable; trim, blank to `null`, preserve meaningful formatting and casing, and do not apply jurisdiction-specific validation. |
| `contactPerson` | String | No | 200 | Primary MVP contact; trim and normalize blank to `null`. |
| `email` | String | No | 320 | Contact email; trim, lowercase, validate when present, and normalize blank to `null`. Not unique. |
| `phone` | String | No | 50 | Trim and normalize blank to `null`; store as text and preserve meaningful formatting and leading zeroes. |
| `address` | String | No | 2,000 | Primary supplier address; trim and normalize blank to `null`. |
| `notes` | String | No | 2,000 | Internal plain-text notes; trim and normalize blank to `null`. |
| `isActive` | Boolean | Yes | — | Defaults to `true`; `false` means archived, not deleted. |
| `createdAt` | Timestamp with time zone | Yes | — | Defaults when created using `timestamptz(3)`. |
| `updatedAt` | Timestamp with time zone | Yes | — | Prisma-maintained using `@updatedAt` and `timestamptz(3)`. |

Supplier uses one primary address for the Phase 4 MVP. Supplier branches,
multiple contacts, supplier catalogues, negotiated prices, payment terms,
ratings, purchasing analytics, and accounts payable belong outside Phase 4A.

### Normalization and Future Write Semantics

Normalization is server-side and backend-authoritative:

- required `name`: trim, reject an empty result, preserve display casing;
- optional strings: omitted during create means `null`; supplied text is
  trimmed, and a blank result becomes `null`;
- email: trim; convert a blank result to `null`; otherwise lowercase, validate,
  and store;
- phone and registration number: trim while preserving meaningful punctuation,
  casing, and leading zeroes; and
- addresses and notes: store plain text only. Rendering layers must escape text
  rather than interpreting stored HTML.

Single-line identity/contact fields must reject control characters. Address and
notes fields may retain ordinary line breaks but must reject NUL and other
unsafe control characters. Phase 4B should add reviewed database checks for the
required trimmed non-empty name and for optional stored strings being either
`NULL` or already trimmed and non-empty. Zod remains the clearer first-line API
validator.

Future PATCH contracts are partial:

```text
field omitted        -> retain the stored value
optional field null  -> clear it
optional field blank -> normalize to null
name omitted         -> retain the stored name
name null or blank   -> validation error
```

Strict request objects must reject unknown fields and protected fields such as
`id`, `companyId`, `createdAt`, `updatedAt`, and future relationship or history
fields. Lifecycle changes use the explicit archive/reactivate behavior below;
they must not be hidden side effects of editing contact details.

### Uniqueness and Identity Decisions

No Customer or Supplier business field is unique in Phase 4:

- names may be identical within one Company;
- registration numbers are not assumed globally or Company-unique;
- contact emails may be shared;
- phone numbers, contact people, and addresses may be shared; and
- different Companies may store completely identical Customer or Supplier data.

Only the UUID primary key identifies a row. This avoids rejecting legitimate
businesses and avoids jurisdiction-specific identity assumptions. If later
usage demonstrates a duplicate-data problem, deduplication should be designed
from real requirements rather than retrofitted as an unsafe uniqueness rule.

### Relationships, Tenant Integrity, and Deletion

```text
Company  1 -> 0..* Customer
Company  1 -> 0..* Supplier

Supplier 1 -> 0..* PurchaseOrder  (future Phase 5 only)
Customer 1 -> 0..* Quotation      (future Phase 6 only)
Customer 1 -> 0..* SalesOrder     (future Phase 6 only)
Customer 1 -> 0..* Invoice        (future Phase 6 only)
```

Every Customer and Supplier belongs to exactly one Company. Future reads and
writes must use the database-revalidated request context:

```text
req.auth = { userId, companyId, role }
```

The client must never select or override `companyId` through a path, query,
body, hidden field, or frontend state. Detail, update, archive, and reactivation
lookups must combine the requested UUID with `req.auth.companyId`; a missing ID
and another Company's ID must return the same tenant-local not-found behavior.

Phase 4B should use direct required Company foreign keys with `ON DELETE
RESTRICT`. Customer and Supplier should each retain their UUID primary key and
add a candidate key on `(id, companyId)` so future transactional foreign keys
can prove same-Company ownership in PostgreSQL. This small overlapping index is
consistent with Phase 3's tenant-aware design and prevents future documents from
linking to another Company's master data. Normal application behavior provides
no hard-delete operation.

### Lifecycle and Authorization

Archiving sets `isActive = false`; reactivation sets it back to `true`.
Archiving is idempotent and does not erase or anonymize the record. An archived
Customer or Supplier remains Company-scoped and readable, may be reactivated,
and remains available to historical references. Future transaction creation
must normally allow only active parties, while existing documents continue to
reference an archived party.

The Phase 4 authorization matrix is:

| Capability | OWNER | ADMIN | STAFF |
| --- | --- | --- | --- |
| List/retrieve Customers | Yes | Yes | Yes |
| Create/update/archive/reactivate Customers | Yes | Yes | No |
| List/retrieve Suppliers | Yes | Yes | Yes |
| Create/update/archive/reactivate Suppliers | Yes | Yes | No |

Every route requires authentication. Backend role guards are authoritative;
hidden frontend controls are only a UX measure. No role beyond `OWNER`, `ADMIN`,
and `STAFF` is introduced.

### Historical Document Snapshot Invariant

Customer and Supplier master data is intentionally mutable. A future document
must therefore not rely only on joining the latest master row to reconstruct
the party name, registration/contact details, or address that applied when the
document was issued or otherwise became historically significant.

Phase 5 and Phase 6 must retain the Customer/Supplier foreign key for identity
and navigation and, where required by that workflow, copy the relevant party
identity, contact, and address values into immutable document snapshot fields at
an explicitly designed document stage. The exact snapshot fields and timing
belong to the Purchase Order, Quotation, Sales Order, and Invoice design
milestones. Phase 4A does not add any transaction or snapshot column.

### Phase 4F Transaction History Foundation

Phase 4F does not change the database. The existing Customer and Supplier UUID
primary keys plus `UNIQUE (id, companyId)` candidate keys are the complete
relational foundation needed before the later transaction domains are designed.
Those candidate keys intentionally allow a future document to carry its own
required `companyId` and use a composite foreign key such as:

```text
(supplierId, companyId) -> Supplier(id, companyId)
(customerId, companyId) -> Customer(id, companyId)
```

This lets PostgreSQL reject a cross-Company party relationship even if
application validation regresses. The exact Purchase Order, Quotation, Sales
Order, and Invoice relationships remain decisions for Phases 5 and 6; Phase 4F
creates none of those models or columns.

The lifecycle and historical rules remain:

- new future transactions normally require an active same-Company Customer or
  Supplier;
- archiving never deletes the party or breaks an existing historical reference;
- all authenticated roles may read the eventual Company-scoped history;
- changing mutable party master data must not rewrite snapshot values stored on
  a historically significant document; and
- real history exists only when the owning Purchasing or Sales module persists
  real business documents.

Accordingly, Phase 4F adds no history table, generic Transaction abstraction,
placeholder row, endpoint, Prisma schema change, or migration. The three
existing migrations remain the complete migration history at this milestone.

### Phase 4B Index and Constraint Direction

The implemented minimum indexes are:

- Customer: candidate key `(id, companyId)` and non-unique
  `(companyId, isActive)` for tenant lifecycle lists;
- Supplier: candidate key `(id, companyId)` and non-unique
  `(companyId, isActive)`; and
- no standalone `companyId` index because it is the leading column of the
  lifecycle index.

Case-insensitive substring search over name, registration number, contact
person, email, or phone is a planned API behavior, but an ordinary B-tree does
not efficiently serve broad substring predicates. Phase 4A does not add a
PostgreSQL extension or speculative search index. The later backend milestone
should first implement the Company-scoped query and add specialized indexing
only when measured data/query behavior justifies it.

Phase 4B verified primary keys, native UUID/timestamp types, nullability,
defaults, length checks, normalized-string checks, Company foreign keys,
candidate keys, lifecycle indexes, and `ON DELETE RESTRICT`. It added no
Purchasing or Sales table.

### Phase 4B Implementation Details

- Migration `20260824025721_add_customer_supplier` creates only `customers` and
  `suppliers` without changing either existing migration.
- Prisma uses `@default(uuid())` with PostgreSQL `uuid`, `@db.Timestamptz(3)`,
  and bounded `varchar` columns matching every approved maximum length.
- Required names are checked as trimmed and non-empty. Optional strings remain
  nullable and are checked to be either `NULL` or trimmed and non-empty. No
  trigger, generated code, email-regex rule, `citext`, or extension was added.
- Each table has only its UUID primary key and intentional unique
  `(id, companyId)` candidate key. No name, registration, contact, email, phone,
  or address uniqueness exists.
- Each table has `(companyId, isActive)` for Company-scoped lifecycle lists. A
  redundant standalone Company index and speculative search indexes were not
  added.
- Both required Company foreign keys use `ON DELETE RESTRICT`; normal lifecycle
  remains archive/reactivate through `isActive`.
- Migration replay, live-schema drift comparisons, PostgreSQL catalog checks,
  transactional integrity checks with rollback cleanup, Prisma validation and
  generation, and all existing backend regressions passed.

### Explicit Phase 4A Exclusions

Phase 4A does not implement Prisma models, migrations, APIs, frontend routes,
search, pagination, transaction history, multiple contacts/addresses, CRM
activity, credit or payment terms, purchasing, goods receiving, quotations,
sales orders, fulfilment, invoices, payments, accounting, Dashboard, or AI.
Product and Inventory behavior remains unchanged.

## Future Planned Models

These models belong to later roadmap design milestones and must not be inferred
as ready for Prisma implementation from this list:

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

- Multiple warehouses
- Customer credit limits
- Payment records
- Audit logs
- More granular role-based permissions
- Soft deletion
- Tax configuration
