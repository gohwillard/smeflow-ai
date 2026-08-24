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

Phase 4A changes documentation only, so its verification is repository and
design consistency rather than application tests. Phase 4B must verify native
UUID/timestamp types, required Company ownership, tenant-aware candidate keys,
restrictive deletion, lifecycle defaults/indexes, string constraints, migration
replay, and schema drift before any Customer or Supplier API is added.

The later Customer and Supplier backend tests must cover strict field rejection,
normalization and null-clearing, non-unique duplicate names/contact details,
OWNER/ADMIN writes, STAFF read-only behavior, archive/reactivation,
missing-versus-cross-Company not-found parity, two-Company list/search
isolation, and preservation of archived historical references. Frontend tests
must confirm role-aware actions and accessible loading, empty, error, detail,
form, archive, and reactivation states. Purchasing and Sales tests will
separately verify active-party selection and immutable document snapshots when
those workflows are designed; Phase 4 does not create fake transaction records.
