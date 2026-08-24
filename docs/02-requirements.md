# 02 — Functional and Non-Functional Requirements

## Functional Requirements

### FR-01 Authentication

The system shall allow a user to:

- Register an account
- Log in
- Log out
- Access protected application pages
- View and update basic profile information

### FR-02 Company

The system shall allow a user to:

- Create a company profile
- Update company details
- Associate business records with the company

### FR-03 Products

The system shall allow authorized users to:

- Create products
- Edit products
- Archive products
- Search and filter products
- Assign product categories
- Define SKU, selling price, cost price and reorder level

For the Phase 3 MVP, Product and Category data is Company-scoped. `OWNER` and
`ADMIN` may manage and archive these records, while `STAFF` has read-only
access. Category names are unique case-insensitively within a Company, Product
SKUs are normalized and remain reserved after archive, and archived Category
relationships remain visible without allowing new assignment to an archived
Category. Product search matches partial SKU or Product name
case-insensitively and may be combined with the low-stock filter.

### FR-04 Inventory

The system shall:

- Track current stock quantity
- Record stock movements
- Support stock-in
- Support stock-out
- Prevent negative stock; the SMEFlow MVP does not allow it
- Display low-stock products

Phase 3 stock changes are limited to `OPENING_BALANCE`, `MANUAL_IN`, and
`MANUAL_OUT`. Every successful stock change must atomically update the current
exact Decimal balance and create exactly one immutable `InventoryMovement` with
backend-derived Company, creator, and before/after values. Opening Balance is
allowed only for an active zero-stock Product with no existing movement;
archived Products cannot be adjusted. `OWNER` and `ADMIN` may adjust stock,
while `STAFF` may only read movement history. Low stock means an active Product
whose `quantityOnHand <= reorderLevel`, including the valid zero/zero case.

### FR-05 Customers

The system shall allow users to:

- Create customers
- Edit customers
- Archive and reactivate customers without deleting business history
- Search customers
- View customer transaction history

For the Phase 4 MVP, a Customer is Company-owned master data for a party to
whom the Company may later sell. Customer records contain a required display
name and optional registration number, primary contact person, non-unique
contact email and phone, billing address, default shipping address, and internal
plain-text notes. `OWNER` and `ADMIN` may manage lifecycle and profile data;
`STAFF` has read-only access. Names and contact fields are not unique. Company
scope always comes from the authenticated backend context, never client input.
Transaction history is a Phase 4F presentation foundation only until Sales
records exist in Phase 6.

### FR-06 Suppliers

The system shall allow users to:

- Create suppliers
- Edit suppliers
- Archive and reactivate suppliers without deleting business history
- Search suppliers
- View supplier purchase history

For the Phase 4 MVP, a Supplier is separate Company-owned master data for a
party from whom the Company may later purchase. Supplier records contain a
required display name and optional registration number, primary contact person,
non-unique contact email and phone, primary address, and internal plain-text
notes. `OWNER` and `ADMIN` may manage lifecycle and profile data; `STAFF` has
read-only access. Archived Suppliers remain historically referenceable but may
not normally be selected for a new future Purchase Order. Purchase history is a
Phase 4F presentation foundation only until Purchasing records exist in Phase 5.

Customer and Supplier master data is mutable. Future Purchase Orders,
Quotations, Sales Orders, and Invoices must retain the relevant master-data
foreign key and, where their own approved design requires it, snapshot the
identity/contact/address values needed for historical document accuracy.

Phase 4F adds only a read-only, authenticated transaction-history foundation to
the existing Customer and Supplier detail pages. `OWNER`, `ADMIN`, and `STAFF`
see the same truthful current state: Customer history will become available with
Sales workflows, and Supplier history will become available with Purchasing
workflows. Phase 4 provides no transaction-history endpoint or fabricated
record. Future transaction creation must accept only an active same-Company
party, while an existing historical document remains readable and related if
that party is later archived.

### FR-07 Quotations

The system shall allow users to:

- Create a quotation
- Add multiple quotation items
- Calculate subtotal and total
- Set quotation status
- Convert an accepted quotation into a sales order

### FR-08 Sales Orders

The system shall allow users to:

- Create a sales order
- Add multiple items
- Track order status
- Confirm the order
- Reduce inventory when the relevant business event occurs

### FR-09 Purchase Orders

The system shall allow users to:

- Create purchase orders
- Select a supplier
- Add multiple products
- Track purchase order status
- Receive purchased stock
- Increase inventory after stock is received

### FR-10 Invoices

The system shall allow users to:

- Generate an invoice from a sales order
- Track invoice status
- Record payment status
- View outstanding invoices

### FR-11 Dashboard

The system shall display:

- Total sales
- Number of orders
- Low-stock products
- Top-selling products
- Recent transactions
- Outstanding invoices

### FR-12 AI Business Assistant

The system shall allow a user to ask natural-language questions about business data.

The AI assistant should:

- Access only authorized company data
- Use application-generated structured data
- Return concise answers
- Explain the data used when appropriate
- Avoid directly modifying business records during the first implementation

## Non-Functional Requirements

### NFR-01 Security

- Passwords must never be stored in plain text.
- Protected APIs require authentication.
- Data access must be scoped to the authenticated user's company.
- Environment secrets must not be committed to Git.

### NFR-02 Maintainability

- Backend code should use controller/service/repository-style separation.
- Database schema changes should use Prisma migrations.
- Reusable frontend components should be separated from page components.

### NFR-03 Reliability

- Important backend operations should use database transactions where appropriate.
- API input must be validated.
- Errors should return consistent responses.

### NFR-04 Performance

- Lists should support pagination.
- Frequently searched fields should be indexed when necessary.
- Dashboard calculations should avoid unnecessary repeated queries.

### NFR-05 Usability

- The interface should be responsive.
- Forms should display validation errors clearly.
- Status values should be visually distinguishable.
- Empty states should guide the user toward the next action.

### NFR-06 Testability

- Core business rules should have automated tests.
- Important API routes should have integration tests.
- Critical user flows should eventually have end-to-end tests.

### NFR-07 Deployability

- Frontend, backend and database should be independently configurable through environment variables.
- Production deployment instructions must be documented.
