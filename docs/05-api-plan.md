# 05 — Initial API Plan

Base path:

```text
/api/v1
```

## Auth

```text
POST   /auth/register
POST   /auth/login
GET    /auth/me
```

### Register a Company Owner

Implemented in Phase 2C:

```text
POST /api/v1/auth/register
```

Request body:

```json
{
  "companyName": "Northstar Supplies",
  "firstName": "Amina",
  "lastName": "Rahman",
  "email": "amina@example.com",
  "password": "example passphrase for local demo"
}
```

Registration accepts only these five fields. Company and personal names are
trimmed and must remain non-empty. Email is trimmed, validated, lowercased, and
stored in that canonical form. Passwords are not trimmed or otherwise
normalized; they must contain 15–128 characters, and no composition rules are
imposed.

The password is stored only as a versioned, self-describing asynchronous Node.js
scrypt hash with a random 16-byte salt and a 64-byte derived key. Company and
initial `OWNER` creation use one nested Prisma write, so both records commit or
both roll back. The global `users.email` unique constraint is the final source of
truth for duplicates, which return HTTP 409 with `EMAIL_ALREADY_EXISTS`.

Successful response: HTTP 201 Created

```json
{
  "status": "success",
  "data": {
    "company": {
      "id": "c42f9c82-84f3-42d8-8c5a-0bbb467f5f91",
      "name": "Northstar Supplies"
    },
    "user": {
      "id": "1e44b878-cfc5-45da-83aa-fe1163b56b8d",
      "email": "amina@example.com",
      "firstName": "Amina",
      "lastName": "Rahman",
      "role": "OWNER",
      "isActive": true,
      "createdAt": "2026-08-18T03:48:15.375Z"
    }
  }
}
```

The response never includes `password` or `passwordHash` and does not issue a
token. Invalid input returns HTTP 400 with safe field-level messages. Unexpected
failures return a generic HTTP 500 response without Prisma details or stack
traces. `GET /auth/me` remains a future milestone.

### Login and Receive an Access Token

Implemented in Phase 2D:

```text
POST /api/v1/auth/login
```

Request body:

```json
{
  "email": "amina@example.com",
  "password": "example passphrase for local demo"
}
```

Login accepts only `email` and `password`. Email is required, trimmed,
validated, and lowercased before lookup, consistently with registration. The
password is a required non-empty string and remains opaque: it is not trimmed,
lowercased, normalized, logged, or echoed. Login intentionally does not apply
registration's 15-character minimum to existing passwords.

The backend retrieves the user by canonical email and asynchronously verifies
the submitted password against the parameters, salt, and derived key embedded in
the existing versioned scrypt hash. Malformed or unsupported stored hashes fail
safely. Unknown emails and incorrect passwords both return HTTP 401 with the
same `INVALID_CREDENTIALS` response. A user whose credentials are correct but
whose account is inactive receives HTTP 403 `ACCOUNT_INACTIVE` and no token.

Successful response: HTTP 200 OK

```json
{
  "status": "success",
  "data": {
    "accessToken": "<signed-access-token>",
    "expiresIn": 1800,
    "user": {
      "id": "1e44b878-cfc5-45da-83aa-fe1163b56b8d",
      "companyId": "c42f9c82-84f3-42d8-8c5a-0bbb467f5f91",
      "email": "amina@example.com",
      "firstName": "Amina",
      "lastName": "Rahman",
      "role": "OWNER",
      "isActive": true
    }
  }
}
```

The access token is signed with explicitly pinned HS256 through `jose`. Its
registered claims are `sub` (the user ID), `iat`, `exp`, `iss`, and `aud`; its
only custom claims are `companyId` and `role`. The configured lifetime is 30
minutes. The API requires `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, and
`JWT_ACCESS_TOKEN_TTL`; the intended issuer and audience are `smeflow-api` and
`smeflow-web`, and the signing secret must contain at least 32 bytes. Real
secrets remain only in untracked environment files.

The response never includes `password` or `passwordHash` and does not set a
cookie. Token-verification middleware, protected routes, and company-isolation
enforcement belong to Phase 2E.

## Products

```text
GET    /products
GET    /products/:id
POST   /products
PATCH  /products/:id
DELETE /products/:id
```

## Categories

```text
GET    /categories
POST   /categories
PATCH  /categories/:id
DELETE /categories/:id
```

## Inventory

```text
GET    /inventory
GET    /inventory/movements
POST   /inventory/adjustments
```

## Customers

```text
GET    /customers
GET    /customers/:id
POST   /customers
PATCH  /customers/:id
DELETE /customers/:id
```

## Suppliers

```text
GET    /suppliers
GET    /suppliers/:id
POST   /suppliers
PATCH  /suppliers/:id
DELETE /suppliers/:id
```

## Quotations

```text
GET    /quotations
GET    /quotations/:id
POST   /quotations
PATCH  /quotations/:id
POST   /quotations/:id/convert-to-sales-order
```

## Sales Orders

```text
GET    /sales-orders
GET    /sales-orders/:id
POST   /sales-orders
PATCH  /sales-orders/:id
POST   /sales-orders/:id/confirm
```

## Purchase Orders

```text
GET    /purchase-orders
GET    /purchase-orders/:id
POST   /purchase-orders
PATCH  /purchase-orders/:id
POST   /purchase-orders/:id/receive
```

## Invoices

```text
GET    /invoices
GET    /invoices/:id
POST   /sales-orders/:id/invoice
PATCH  /invoices/:id
```

## Dashboard

```text
GET /dashboard/summary
GET /dashboard/sales
GET /dashboard/top-products
GET /dashboard/low-stock
```

## AI

Initial read-only endpoint:

```text
POST /ai/query
```

Example request:

```json
{
  "question": "Which 5 products generated the most revenue this month?"
}
```

The AI module should never directly execute arbitrary SQL generated by the model.

Preferred design:

```text
User question
   ↓
Backend
   ↓
Choose approved business data function
   ↓
Retrieve structured data
   ↓
LLM summarizes / explains result
   ↓
Return response
```
