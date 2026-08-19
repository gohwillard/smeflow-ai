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
assignment, read-only stock, and fixed-scale decimal-string responses. The
complete backend regression suite currently contains 137 passing tests across 6
test files.

## Phase 3D Coverage

Phase 3D frontend tests cover protected Product and Category routes, loading and
empty states, OWNER/ADMIN management, STAFF read-only behavior, Category
create/edit/archive/reactivation, Product list/create/detail/edit/lifecycle
flows, active and archived Category relationships, Uncategorized Products,
fixed-scale decimal-string request handling, duplicate and unavailable-record
errors, reusable archive/reactivation confirmation behavior, focus and Escape
handling, pending-request deduplication, destructive action semantics,
read-only stock, and the existing 401, 403, logout, and memory-only-authentication
behavior. The complete frontend regression suite contains 71 passing tests
across 3 test files.
