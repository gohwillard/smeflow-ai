# 04 — Initial Database Design

## Design Principles

1. Use PostgreSQL.
2. Use UUIDs or generated IDs consistently.
3. Use foreign keys.
4. Avoid storing duplicated derived data unless there is a good reason.
5. Track timestamps.
6. Keep inventory movement history.
7. Scope business data by company.

## Initial Entities

### User

Key fields:

- id
- email
- passwordHash
- firstName
- lastName
- companyId
- createdAt
- updatedAt

### Company

- id
- name
- registrationNumber
- phone
- email
- address
- createdAt
- updatedAt

### Category

- id
- companyId
- name
- description

### Product

- id
- companyId
- categoryId
- sku
- name
- description
- costPrice
- sellingPrice
- stockQuantity
- reorderLevel
- isActive
- createdAt
- updatedAt

### InventoryMovement

- id
- companyId
- productId
- type
- quantity
- referenceType
- referenceId
- note
- createdAt

Possible movement types:

- PURCHASE_RECEIPT
- SALE
- ADJUSTMENT_IN
- ADJUSTMENT_OUT
- RETURN_IN
- RETURN_OUT

### Customer

- id
- companyId
- name
- email
- phone
- address
- createdAt
- updatedAt

### Supplier

- id
- companyId
- name
- email
- phone
- address
- createdAt
- updatedAt

### Quotation

- id
- companyId
- customerId
- quotationNumber
- status
- issueDate
- expiryDate
- subtotal
- taxAmount
- total
- notes
- createdAt
- updatedAt

### QuotationItem

- id
- quotationId
- productId
- description
- quantity
- unitPrice
- lineTotal

### SalesOrder

- id
- companyId
- customerId
- quotationId
- orderNumber
- status
- orderDate
- subtotal
- taxAmount
- total
- createdAt
- updatedAt

### SalesOrderItem

- id
- salesOrderId
- productId
- description
- quantity
- unitPrice
- lineTotal

### PurchaseOrder

- id
- companyId
- supplierId
- purchaseOrderNumber
- status
- orderDate
- expectedDate
- subtotal
- taxAmount
- total
- createdAt
- updatedAt

### PurchaseOrderItem

- id
- purchaseOrderId
- productId
- quantity
- unitCost
- lineTotal
- receivedQuantity

### Invoice

- id
- companyId
- customerId
- salesOrderId
- invoiceNumber
- status
- issueDate
- dueDate
- subtotal
- taxAmount
- total
- amountPaid
- createdAt
- updatedAt

## Important Relationships

```text
Company 1 ─── * User
Company 1 ─── * Product
Company 1 ─── * Customer
Company 1 ─── * Supplier

Category 1 ─── * Product

Product 1 ─── * InventoryMovement

Customer 1 ─── * Quotation
Quotation 1 ─── * QuotationItem
Quotation 0..1 ─── 1 SalesOrder

Customer 1 ─── * SalesOrder
SalesOrder 1 ─── * SalesOrderItem
SalesOrder 0..1 ─── 1 Invoice

Supplier 1 ─── * PurchaseOrder
PurchaseOrder 1 ─── * PurchaseOrderItem
```

## Later Improvements

After the MVP:

- Product units
- Multiple warehouses
- Customer credit limits
- Payment records
- Audit logs
- Role-based permissions
- Soft deletion
- Tax configuration
