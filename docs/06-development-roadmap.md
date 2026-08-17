# 06 — Development Roadmap

## Phase 0 — Repository and Planning

Goal: establish professional project foundations.

Tasks:

- [ ] Create GitHub repository
- [ ] Add README
- [ ] Add documentation folder
- [ ] Create monorepo structure
- [ ] Configure TypeScript
- [ ] Configure linting and formatting
- [ ] Create development branches/issues
- [ ] Make initial commit

Deliverable:

A clean public repository that already explains what the project will become.

---

## Phase 1 — Application Foundation

Goal: frontend, backend and database can run locally.

Tasks:

- [ ] Scaffold React application
- [ ] Scaffold Express API
- [ ] Configure PostgreSQL
- [ ] Install Prisma
- [ ] Add first migration
- [ ] Add health-check endpoint
- [ ] Connect frontend to backend
- [ ] Configure environment variables

Definition of Done:

Opening the web app successfully calls:

```text
GET /api/v1/health
```

and displays API status.

---

## Phase 2 — Authentication and Company Setup

Tasks:

- [ ] User registration
- [ ] Password hashing
- [ ] Login
- [ ] JWT authentication
- [ ] Auth middleware
- [ ] Company profile
- [ ] Protected frontend routes

Definition of Done:

A new user can register, sign in and access only their own company data.

---

## Phase 3 — Product and Inventory Module

Tasks:

- [ ] Category CRUD
- [ ] Product CRUD
- [ ] Product search
- [ ] Stock quantity
- [ ] Inventory movement table
- [ ] Manual stock adjustment
- [ ] Low-stock indicator
- [ ] Tests for stock rules

This is the first major portfolio milestone.

---

## Phase 4 — Customers and Suppliers

Tasks:

- [ ] Customer CRUD
- [ ] Supplier CRUD
- [ ] Search/filter
- [ ] Detail pages
- [ ] Related transaction history

---

## Phase 5 — Purchasing Workflow

Business flow:

```text
Supplier
→ Purchase Order
→ Receive Items
→ Inventory Movement
→ Stock Quantity Increase
```

Tasks:

- [ ] Create purchase order
- [ ] Add purchase order items
- [ ] PO statuses
- [ ] Receive items
- [ ] Update stock inside a database transaction
- [ ] Record inventory movements
- [ ] Test purchasing business logic

---

## Phase 6 — Sales Workflow

Business flow:

```text
Customer
→ Quotation
→ Sales Order
→ Invoice
→ Stock Movement
```

Tasks:

- [ ] Create quotation
- [ ] Add quotation items
- [ ] Convert quotation
- [ ] Create sales order
- [ ] Confirm / fulfil sales order
- [ ] Reduce inventory
- [ ] Generate invoice
- [ ] Test sales business logic

---

## Phase 7 — Dashboard

Tasks:

- [ ] Sales KPI cards
- [ ] Order statistics
- [ ] Low-stock list
- [ ] Top products
- [ ] Recent orders
- [ ] Outstanding invoices
- [ ] Date filters

---

## Phase 8 — AI Business Assistant

Start AI only after business data is reliable.

Version 1 should be read-only.

Supported questions may include:

- Top-selling products
- Low-stock products
- Sales totals
- Customer ranking
- Outstanding invoices
- Product reorder suggestions

Tasks:

- [ ] Define allowed AI tools/functions
- [ ] Create business query service
- [ ] Integrate LLM API
- [ ] Add AI chat interface
- [ ] Add source/metric explanation
- [ ] Add AI failure handling
- [ ] Test authorization boundaries

---

## Phase 9 — Production Quality

Tasks:

- [ ] Unit tests
- [ ] Integration tests
- [ ] Loading/empty/error states
- [ ] Logging
- [ ] Seed/demo data
- [ ] Security review
- [ ] Responsive UI polish
- [ ] CI pipeline

---

## Phase 10 — Deployment and Portfolio Presentation

Tasks:

- [ ] Deploy PostgreSQL
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Configure production environment variables
- [ ] Add demo user
- [ ] Add screenshots
- [ ] Add architecture diagram
- [ ] Add ERD
- [ ] Record demo video
- [ ] Improve README
- [ ] Link project from portfolio site
