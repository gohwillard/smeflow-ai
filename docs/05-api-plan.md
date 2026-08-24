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
traces.

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
cookie. Phase 2E uses this access token for protected API authentication.

### Retrieve the Authenticated User

Implemented in Phase 2E:

```text
GET /api/v1/auth/me
Authorization: Bearer <access-token>
```

The endpoint accepts access tokens only through the standard Bearer
`Authorization` header. Tokens in query parameters, request bodies, URL paths,
or custom token fields are not accepted. The middleware cryptographically
verifies the signature with the configured HS256 algorithm, issuer, audience,
and expiration requirements, and requires valid `sub`, `companyId`, `role`,
`iss`, `aud`, `iat`, and `exp` claims.

After token verification, the middleware loads the current User by `sub` and
requires that the User still exists, remains active, and still has the company
and role represented by the token. The current database values establish the
trusted request context:

```text
req.auth = { userId, companyId, role }
```

Future company-scoped modules must derive their ownership filter from
`req.auth.companyId`; they must not trust a `companyId` supplied by a client.

Successful response: HTTP 200 OK

```json
{
  "status": "success",
  "data": {
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

Missing credentials return HTTP 401 `AUTHENTICATION_REQUIRED`. Malformed,
invalid, expired, wrongly issued, wrongly targeted, unsupported-algorithm, stale,
or unknown-user tokens return HTTP 401 `INVALID_TOKEN`. These 401 responses use
`WWW-Authenticate: Bearer`. A cryptographically valid token for a User who is
now inactive returns HTTP 403 `ACCOUNT_INACTIVE`. Responses do not expose token,
cryptographic, Prisma, or password details, and `passwordHash` is never selected
for the response.

## Company

Implemented in Phase 2F:

```text
GET    /company/profile
PATCH  /company/profile
```

Both routes require a valid Bearer access token. They derive the Company
exclusively from the current database-validated `req.auth.companyId`; there is no
client-selectable Company ID in the path, query contract, or request body.

### Retrieve the Company Profile

```text
GET /api/v1/company/profile
Authorization: Bearer <access-token>
```

`OWNER`, `ADMIN`, and `STAFF` may retrieve their own Company. The response
contains only the approved profile fields:

```json
{
  "status": "success",
  "data": {
    "company": {
      "id": "c42f9c82-84f3-42d8-8c5a-0bbb467f5f91",
      "name": "Northstar Supplies",
      "registrationNumber": "202601234567",
      "email": "contact@northstar.example",
      "phone": "+60 12 345 6789",
      "address": "1 Example Road, Kuala Lumpur",
      "createdAt": "2026-08-18T03:48:15.375Z",
      "updatedAt": "2026-08-18T07:30:00.000Z"
    }
  }
}
```

### Update the Company Profile

```text
PATCH /api/v1/company/profile
Authorization: Bearer <access-token>
```

`OWNER` and `ADMIN` may update the profile. `STAFF` receives HTTP 403
`FORBIDDEN`. The strict request body allows only `name`, `registrationNumber`,
`email`, `phone`, and `address`; unknown and immutable fields are rejected with
HTTP 400 `VALIDATION_ERROR`.

PATCH is partial: omitted fields retain their current values. Supplied strings
are trimmed and cannot be blank. `name` cannot be `null`. The other four fields
are optional and accept explicit `null` to clear their stored values. Company
contact email is validated, trimmed, and lowercased, but remains separate from
the globally unique User login email and is not unique.

An authenticated request whose Company unexpectedly cannot be found receives a
safe HTTP 404 `COMPANY_NOT_FOUND` response. Prisma and database details are not
returned.

## Products

Implemented in Phase 3C and extended in Phase 3F:

```text
GET    /products
GET    /products/:productId
POST   /products
PATCH  /products/:productId
DELETE /products/:productId
```

All routes require Bearer authentication and derive Company scope exclusively
from `req.auth.companyId`. `OWNER`, `ADMIN`, and `STAFF` may list and retrieve.
Only `OWNER` and `ADMIN` may create, update, or archive; `STAFF` receives HTTP
403 `FORBIDDEN` for writes. Lists include active and archived records in
deterministic `createdAt ASC, id ASC` order. Phase 3F extends only the existing
list endpoint with optional `search` and `lowStock=true` query parameters;
pagination remains deferred.

`search` is trimmed, limited to 200 characters, and treats a blank value as no
search. It performs a case-insensitive PostgreSQL substring match against SKU or
Product name. Normal search may return active or archived Products. `lowStock`
accepts only the literal string `true`; values such as `false`, `1`, `yes`, and
unknown query parameters return HTTP 400 `VALIDATION_ERROR`.

When `lowStock=true`, PostgreSQL returns only:

```text
isActive = true AND quantityOnHand <= reorderLevel
```

Prisma's typed Product field reference compares the two exact `numeric(14,3)`
columns directly. This includes active Products at equality and the valid
`0.000 <= 0.000` case, while excluding archived Products. `search` and
`lowStock=true` combine with AND semantics. Every variant remains scoped only by
the authenticated `req.auth.companyId`; clients cannot supply `companyId`.
The safe Product response contract is unchanged and does not duplicate a derived
low-stock field.

Create accepts only `categoryId` (optional UUID or `null`), `sku`, `name`,
`description` (optional string or `null`), `unit`, `costPrice`, `sellingPrice`,
and `reorderLevel` (optional). PATCH accepts those fields plus `isActive`.
Unknown and immutable fields—including `companyId` and `quantityOnHand`—return
HTTP 400 `VALIDATION_ERROR`. SKU, name, unit, and supplied description are
trimmed; SKU and unit are uppercased; a blank description becomes `null`. New
Products always start at `quantityOnHand = 0`.

Money and quantity inputs must be non-negative decimal strings: prices allow at
most two fractional digits, while `reorderLevel` allows at most three. Product
responses use fixed-scale exact strings (`costPrice` and `sellingPrice` with two
digits; `quantityOnHand` and `reorderLevel` with three) and contain:

```json
{
  "id": "ae7c26d2-a801-4814-91cc-7b9ab8d652e0",
  "categoryId": null,
  "sku": "DRILL-001",
  "name": "Cordless Drill",
  "description": "18V cordless drill",
  "unit": "PCS",
  "costPrice": "10.25",
  "sellingPrice": "15.99",
  "quantityOnHand": "0.000",
  "reorderLevel": "1.500",
  "isActive": true,
  "createdAt": "2026-08-19T04:30:00.000Z",
  "updatedAt": "2026-08-19T04:30:00.000Z"
}
```

A supplied Category must be active and owned by the authenticated Company.
Cross-Company, inactive, and unavailable Categories share HTTP 400
`CATEGORY_UNAVAILABLE`. Existing Product links remain intact after a Category
is archived, and unrelated Product updates continue to work; only a new or
changed assignment is checked for active status. Duplicate normalized SKUs
return HTTP 409 `SKU_ALREADY_EXISTS`.

DELETE sets `isActive = false`, returns the safe Product, and is idempotent. It
does not delete the row, release the SKU, alter `quantityOnHand`, or create or
delete InventoryMovement records. PATCH may reactivate with `isActive: true`.
Tenant-local missing and cross-Company IDs both return HTTP 404
`PRODUCT_NOT_FOUND`.

## Categories

Implemented in Phase 3C:

```text
GET    /categories
GET    /categories/:categoryId
POST   /categories
PATCH  /categories/:categoryId
DELETE /categories/:categoryId
```

All routes require Bearer authentication and use only `req.auth.companyId` for
ownership. All roles may list and retrieve; only `OWNER` and `ADMIN` may create,
update, and archive. Lists include active and archived Categories in
deterministic creation order.

Create accepts only `name` and optional `description`. PATCH accepts `name`,
`description`, and `isActive`. Names are trimmed and nonblank; descriptions are
trimmed, accept `null`, and normalize blank strings to `null`. Unknown and
immutable fields, including `companyId`, return HTTP 400 `VALIDATION_ERROR`.
Responses contain only `id`, `name`, `description`, `isActive`, `createdAt`, and
`updatedAt`.

Category names preserve their display casing but are unique case-insensitively
within one Company across active and archived rows. Conflicts return HTTP 409
`CATEGORY_ALREADY_EXISTS`; different Companies may use the same name. DELETE
sets `isActive = false`, is idempotent, and never deletes or detaches Products.
PATCH may reactivate with `isActive: true`. Tenant-local missing and
cross-Company IDs both return HTTP 404 `CATEGORY_NOT_FOUND`.

## Inventory

Implemented in Phase 3E:

```text
GET    /products/:productId/inventory-movements
POST   /products/:productId/inventory-adjustments
```

Both routes require Bearer authentication, validate `productId` as a UUID, and
derive Company scope exclusively from `req.auth.companyId`. Cross-Company and
missing Product IDs both return HTTP 404 `PRODUCT_NOT_FOUND`. There is no generic
InventoryMovement create, update, or delete API.

### Retrieve Product Inventory Movement History

`OWNER`, `ADMIN`, and `STAFF` may call:

```text
GET /api/v1/products/:productId/inventory-movements
```

The endpoint returns the Product's immutable movements in deterministic
newest-first order using `createdAt DESC, id DESC`. Archived Product history
remains readable. Each movement contains only safe audit fields:

```json
{
  "status": "success",
  "data": {
    "movements": [
      {
        "id": "9ca7fcbe-eac6-4864-944f-47eb077114f6",
        "type": "MANUAL_IN",
        "quantity": "5.500",
        "quantityBefore": "4.500",
        "quantityAfter": "10.000",
        "note": "Physical count correction",
        "createdAt": "2026-08-20T02:00:00.000Z",
        "createdBy": {
          "id": "1e44b878-cfc5-45da-83aa-fe1163b56b8d",
          "firstName": "Amina",
          "lastName": "Rahman"
        }
      }
    ]
  }
}
```

The response omits `companyId`, `createdByUserId`, user email, password material,
and authentication internals. A Product without movements returns an empty array.

### Perform a Controlled Inventory Adjustment

Only `OWNER` and `ADMIN` may call:

```text
POST /api/v1/products/:productId/inventory-adjustments
```

`STAFF` receives HTTP 403 `FORBIDDEN`. The strict request body accepts only:

```json
{
  "type": "MANUAL_IN",
  "quantity": "5.500",
  "note": "Physical count correction"
}
```

`type` is limited to `OPENING_BALANCE`, `MANUAL_IN`, and `MANUAL_OUT`.
`quantity` must be a positive decimal string with at most 11 integer digits and
3 fractional digits. Numeric JSON values, zero, negative, blank, excessive-scale,
excessive-precision, unsupported types, and unknown fields are rejected with
HTTP 400 `VALIDATION_ERROR`. `note` is optional, accepts `null`, is trimmed, and
normalizes blank text to `null`.

The backend derives `companyId`, `productId`, `createdByUserId`,
`quantityBefore`, and `quantityAfter`. A successful HTTP 201 response returns the
authoritative new balance and created safe movement:

```json
{
  "status": "success",
  "data": {
    "product": {
      "id": "ae7c26d2-a801-4814-91cc-7b9ab8d652e0",
      "quantityOnHand": "10.000"
    },
    "movement": {
      "id": "9ca7fcbe-eac6-4864-944f-47eb077114f6",
      "type": "MANUAL_IN",
      "quantity": "5.500",
      "quantityBefore": "4.500",
      "quantityAfter": "10.000",
      "note": "Physical count correction",
      "createdAt": "2026-08-20T02:00:00.000Z",
      "createdBy": {
        "id": "1e44b878-cfc5-45da-83aa-fe1163b56b8d",
        "firstName": "Amina",
        "lastName": "Rahman"
      }
    }
  }
}
```

`OPENING_BALANCE` requires an active Product at exactly zero stock with no prior
movement. `MANUAL_IN` adds the positive quantity. `MANUAL_OUT` uses an atomic
stock-sufficiency condition and never allows a negative balance. Archived
Products return HTTP 409 `PRODUCT_INACTIVE`; invalid opening balance returns
HTTP 409 `OPENING_BALANCE_NOT_ALLOWED`; insufficient stock returns HTTP 409
`INSUFFICIENT_STOCK`.

The conditional Product update and exactly one InventoryMovement insert run in
one Prisma interactive transaction. PostgreSQL holds the updated Product row
lock through commit, so a competing operation re-evaluates its condition against
the committed balance. Both records commit together or both roll back.

## Customers

Planned for the later Phase 4 Customer backend milestone; not implemented in
Phase 4A:

```text
GET    /customers
GET    /customers/:customerId
POST   /customers
PATCH  /customers/:customerId
DELETE /customers/:customerId
```

All routes will require Bearer authentication and derive ownership exclusively
from `req.auth.companyId`. `OWNER`, `ADMIN`, and `STAFF` may list/retrieve;
`OWNER` and `ADMIN` may create, update, archive, and reactivate. `STAFF` writes
return HTTP 403. Missing and cross-Company IDs share `CUSTOMER_NOT_FOUND`.

Create will strictly accept `name` plus optional `registrationNumber`,
`contactPerson`, `email`, `phone`, `billingAddress`, `shippingAddress`, and
`notes`. It will reject unknown or protected fields including `id`, `companyId`,
`isActive`, timestamps, and future transaction/history fields. Required name is
trimmed, nonblank, at most 200 characters, and keeps display casing. Optional
strings are trimmed and blank values become `null`; email is lowercased and
validated. Names, registration numbers, emails, and phones are not unique.

PATCH is partial: omission preserves a value, explicit `null` clears an optional
field, blank optional text normalizes to `null`, and `name` cannot be `null` or
blank. DELETE is an idempotent archive operation (`isActive = false`), never a
physical delete. Reactivation follows the established lifecycle pattern by
setting `isActive: true` through an explicit PATCH lifecycle action; ordinary
profile editing must not change lifecycle accidentally. Responses omit
`companyId` and expose only approved business fields.

The later list implementation may accept a strictly validated optional search
term matching name, registration number, contact person, email, or phone
case-insensitively. Search and any active/archive filter remain Company-scoped.
The exact pagination/filter contract belongs to Phase 4C; Phase 4A adds no
endpoint, extension, or search index.

## Suppliers

Planned for the later Phase 4 Supplier backend milestone; not implemented in
Phase 4A:

```text
GET    /suppliers
GET    /suppliers/:supplierId
POST   /suppliers
PATCH  /suppliers/:supplierId
DELETE /suppliers/:supplierId
```

Authentication, Company isolation, role enforcement, tenant-local not-found
behavior, strict request validation, lifecycle semantics, and safe response
selection mirror Customers. Create will accept only `name` plus optional
`registrationNumber`, `contactPerson`, `email`, `phone`, `address`, and `notes`.
PATCH uses the same omitted/`null`/blank rules. DELETE archives idempotently;
reactivation is an explicit `isActive: true` PATCH lifecycle action.

Future Supplier search may match name, registration number, contact person,
email, or phone case-insensitively, always combined with authenticated Company
scope. Exact list parameters and evidence-based indexing belong to Phase 4D.
No Supplier API exists during Phase 4A.

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
