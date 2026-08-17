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
2. A sales order cannot reduce stock below zero.
3. A quotation conversion should not create duplicate sales orders.
4. A user cannot access another company's records.
5. Invoice totals must equal the associated line-item calculations.
