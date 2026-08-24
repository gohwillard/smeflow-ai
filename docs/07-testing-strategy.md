# 07 — Testing Strategy

## Why Testing Matters for This Project

This project is intended to demonstrate more than UI development.

Tests should show that business rules are reliable.

## Test Layers

### Unit Tests

Focus on business logic.

Examples:

- Calculate quotation total
- Calculate sales order total
- Reject quantity <= 0
- Detect insufficient stock
- Determine low-stock products
- Calculate outstanding invoice amount

### API Integration Tests

Use a test database where practical.

Examples:

- Register user
- Login
- Create product
- Update product
- Create customer
- Create purchase order
- Receive purchase order
- Convert quotation to sales order

### Frontend Tests

Focus on important UI behaviour.

Examples:

- Login validation
- Product form validation
- API error display
- Loading state
- Empty state

### End-to-End Tests

Add later for critical business workflows.

Example:

```text
Login
→ Create Product
→ Create Supplier
→ Create Purchase Order
→ Receive Stock
→ Create Customer
→ Create Quotation
→ Convert to Sales Order
→ Generate Invoice
```

## High-Value Test Cases

The most important tests are the ones that protect business data.

Examples:

1. Receiving the same purchase order twice must not accidentally double stock.
2. A manual adjustment or future sales fulfilment cannot reduce stock below
   zero, including when competing stock-out requests run concurrently.
3. A stock balance change and its InventoryMovement must commit or roll back
   together.
4. A quotation conversion should not create duplicate sales orders.
5. A user cannot access another company's records or connect records across
   Companies.
6. Invoice totals must equal the associated line-item calculations.

## Phase 3C Coverage

Phase 3C integration tests exercise the real Express routes and PostgreSQL
constraints for Category and Product CRUD. They cover OWNER/ADMIN/STAFF
authorization, two-Company isolation, strict field rejection, archive behavior,
case-insensitive Category uniqueness, normalized SKU uniqueness, active Category
assignment, read-only stock, and fixed-scale decimal-string responses. At Phase
3C completion, the backend regression suite contained 137 passing tests across
6 test files.

## Phase 3D Coverage

Phase 3D frontend tests cover protected Product and Category routes, loading and
empty states, OWNER/ADMIN management, STAFF read-only behavior, Category
create/edit/archive/reactivation, Product list/create/detail/edit/lifecycle
flows, active and archived Category relationships, Uncategorized Products,
fixed-scale decimal-string request handling, duplicate and unavailable-record
errors, reusable archive/reactivation confirmation behavior, focus and Escape
handling, pending-request deduplication, destructive action semantics,
read-only stock, and the existing 401, 403, logout, and memory-only-authentication
behavior. At Phase 3D completion, the frontend regression suite contained 71
passing tests across 3 test files.

## Phase 3E Coverage

Phase 3E backend integration tests exercise the authenticated Product-scoped
history and adjustment routes against PostgreSQL. Coverage includes strict
business-command validation, exact decimal strings, safe creator responses,
OWNER/ADMIN writes, STAFF reads, two-Company isolation, active/archived rules,
Opening Balance eligibility, exact Stock In and Stock Out transitions,
insufficient-stock rollback, deterministic history, and immutable API scope. A
real concurrent regression starts at `5.000` and issues two simultaneous
`MANUAL_OUT 4.000` requests; exactly one succeeds, final stock is `1.000`, and
only one correct movement exists. A transaction regression replaces only the
test transaction's movement-create delegate with a failure after the real
Product update; the HTTP request fails safely and PostgreSQL rolls back the
balance with no partial movement.

Phase 3E frontend tests cover independent history loading, empty, error, retry,
and populated states; business-facing movement labels; exact quantities and
before/after balances; note and creator display; API-order rendering; OWNER,
ADMIN, STAFF, and archived-Product behavior; Opening Balance eligibility; Stock
In and Stock Out requests; approved-field-only payloads; backend-authoritative
refresh; insufficient-stock and validation feedback; cancellation; focus;
client-side exact-decimal validation; and duplicate-submission prevention.

The complete regression suites now contain 176 passing backend tests across 7
files and 88 passing frontend tests across 4 files.

## Phase 3F Coverage

Phase 3F backend integration tests cover authentication; OWNER, ADMIN, and STAFF
read access; exact, partial, case-insensitive, and whitespace-normalized SKU and
Product-name search; empty results; archived normal-search matches; strict and
unknown query rejection; two-Company isolation; unchanged Product data; normal
list compatibility; the active low-stock cases below, equal to, and above
reorder; the approved zero/zero case; archived exclusion; literal
`lowStock=true` validation; deterministic results; and search plus low stock with
AND semantics. The low-stock query executes against PostgreSQL using Prisma's
typed exact-Decimal field reference.

Phase 3F frontend tests cover accessible search and low-stock controls for all
roles; encoded SKU and Product-name requests; clear/reset behavior; backend
low-stock enable/disable requests; active, equal, above, zero/zero, and archived
badge behavior; combined-filter preservation; filtered no-result recovery; and
filter-aware inventory refetch that removes a Product after Stock In resolves
its low-stock condition without sending a Product CRUD stock write.

The complete regression suites now contain 207 passing backend tests across 8
files and 106 passing frontend tests across 5 files.

## Phase 3G Final Verification Coverage

Phase 3G reruns the complete backend and frontend suites rather than only
Phase 3 tests. Its live PostgreSQL review covers the committed migrations,
catalog constraints and indexes, enum values, tenant-aware relationships, and
both migration-to-live and schema-to-live drift comparisons. The existing real
database regressions re-prove atomic rollback after a Product update and one
winner from two concurrent `MANUAL_OUT 4.000` requests against `5.000` stock.

A disposable real-API/two-Company scenario additionally verifies the approved
`0.000 -> 10.000 -> 15.500 -> 12.250 -> 0.000` lifecycle, rejection of a final
excessive `0.001` Stock Out without a partial write, Opening Balance rules,
newest-first safe history, all requested search forms, representative low-stock
cases, search-plus-low-stock AND behavior, filter-aware refetch after Stock In,
role restrictions, Company isolation, and strict request injection. Responsive
browser checks cover 1440×1000, 430×932, and 390×844, including mobile Product
card dividers, lifecycle dialogs, form dropdowns, the non-resizing inventory
dropdown, STAFF read-only presentation, focus behavior, storage hygiene, and
intentional refresh-to-login behavior.

At Phase 3G Codex verification, all 207 backend tests across 8 files and all
106 frontend tests across 5 files pass.

## Phase 4 Verification Direction

Phase 4A changed documentation only, so its verification was repository and
design consistency. Phase 4B verified native UUID/timestamp and bounded string
types, required Company ownership, tenant-aware candidate keys, restrictive
deletion, lifecycle defaults/indexes, normalized-string constraints, migration
replay, and two no-drift comparisons before any Customer or Supplier API was
added. Transactional PostgreSQL checks covered nullable fields, active defaults,
duplicate names/contact data within and across Companies, missing-Company FK
rejection, restricted Company deletion, length enforcement, and rollback
cleanup. All 207 existing backend tests across 8 files also passed.

The later Customer and Supplier backend tests must cover strict field rejection,
normalization and null-clearing, non-unique duplicate names/contact details,
OWNER/ADMIN writes, STAFF read-only behavior, archive/reactivation,
missing-versus-cross-Company not-found parity, two-Company list/search
isolation, and preservation of archived historical references. Frontend tests
must confirm role-aware actions and accessible loading, empty, error, detail,
form, archive, and reactivation states. Purchasing and Sales tests will
separately verify active-party selection and immutable document snapshots when
those workflows are designed; Phase 4 does not create fake transaction records.

## Phase 4C Coverage

Phase 4C adds 109 Customer and Supplier API integration tests across two
independent files. Both suites exercise real authenticated Express routes and
PostgreSQL data. Coverage includes OWNER and ADMIN create/update/archive/
reactivate access; STAFF list/detail access and rejected writes; unauthenticated
requests; strict UUID, body, and no-query contracts; maximum lengths and email
validation; server-side trimming, lowercasing, optional blank-to-null, and
explicit null clearing; protected-field and `companyId` injection rejection;
deliberately allowed duplicate names, emails, and registration numbers;
idempotent archive without physical deletion; archived detail reads; explicit
`isActive: true` reactivation; rejected `isActive: false` PATCH requests; safe
response selection; and missing-versus-cross-Company not-found parity for
detail, update, archive, and reactivation.

The complete backend regression suite contains 316 passing tests across 10 test
files. Phase 4C also passes backend typecheck/build and Prisma validation,
generation, and migration status with exactly three migrations. Frontend tests
were not run because Phase 4C changes no frontend code or contract.

## Phase 4D Coverage

Phase 4D adds 32 Customer and Supplier frontend tests across two independent
files. Both modules cover protected list/create/detail/edit routes; loading,
empty, error, and tenant-safe not-found states; active and archived records;
responsive table-to-card labels; OWNER and ADMIN management controls; STAFF
read-only list, detail, empty-state, and direct-form behavior; accessible form
fields and required-name validation; backend field-error mapping; safe create
payloads without `companyId` or lifecycle fields; authoritative detail reloads;
diff-only edit requests; optional-field clearing through `null`; archived-record
editing without implicit reactivation; custom archive/reactivate dialogs;
destructive versus positive styling; DELETE archive requests; and reactivation
PATCH requests containing only `{ isActive: true }`.

The final Phase 4D frontend baseline contains 141 passing tests across 7 test
files after the approved dashboard shortcuts were added. Frontend lint and the
TypeScript-backed production build pass. Responsive markup and CSS are
implemented for desktop tables and narrow-screen stacked cards. The subsequent
manual browser review at desktop, 430×932, and 390×844 approved Phase 4D after
its documented UI remediations.

## Phase 4E Coverage

Phase 4E adds 91 Customer and Supplier backend integration cases across two new
independent files. Each module verifies OWNER/ADMIN/STAFF read access; exact,
partial, case-insensitive, and whitespace-normalized searches over name,
registration number, contact person, email, and phone; intentional exclusion of
addresses and notes; archived matches when status is omitted; active and
archived status filters; combined AND semantics; empty, blank, overlong,
control-character, and repeated search rejection; literal status validation;
strict rejection of Company, pagination, sorting, Boolean lifecycle,
Product-only, and arbitrary query fields; and Company isolation for search,
status, and combined queries.

Phase 4E also adds 22 frontend cases in one focused file. Customer and Supplier
coverage verifies accessible controls for all three roles, trimmed and encoded
search requests, active/archived/All mapping, combined search/status requests,
clear-search preservation, clear-all recovery, distinct filtered no-result
states, STAFF discovery access without writes, endpoint separation, absence of
client Company scope, and filter-aware authoritative lifecycle refetches. The
existing Phase 4D lifecycle cases now also assert the unfiltered authoritative
refetch.

The complete regression suites contain 407 passing backend tests across 12
files and 163 passing frontend tests across 8 files. Backend typecheck/build,
frontend lint/build, Prisma validation/generation/migration status, and
repository hygiene checks pass. Responsive source review confirms the discovery
controls use the existing desktop grid and stack vertically at the established
52rem and 36rem breakpoints; final manual Phase 4E browser review at desktop,
430×932, and 390×844 remains required for approval.
