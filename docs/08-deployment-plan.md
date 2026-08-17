# 08 — Deployment Plan

## Recommended Initial Deployment

### Frontend

Vercel

Reason:

- Simple React deployment
- Automatic deployment from GitHub
- Preview deployments for pull requests

### Backend

Render

Reason:

- Simple Node.js web service deployment
- GitHub integration
- Environment variable support
- Suitable for a portfolio API

### Database

Managed PostgreSQL.

Possible initial option:

- Render PostgreSQL

The provider can be changed later without changing the overall architecture.

## Environment Variables

Frontend example:

```text
VITE_API_BASE_URL=
```

Backend example:

```text
PORT=
DATABASE_URL=
JWT_SECRET=
CORS_ORIGIN=
OPENAI_API_KEY=
```

Never commit real secret values.

## Deployment Order

1. Create production PostgreSQL database.
2. Set backend `DATABASE_URL`.
3. Run Prisma migrations.
4. Deploy backend.
5. Verify health endpoint.
6. Configure frontend API URL.
7. Deploy frontend.
8. Test complete business flow.
9. Add production URL to README.

## Demo Data

Create a seed script so recruiters can view useful data immediately.

Suggested demo company:

```text
GL Hardware Demo Trading
```

Suggested demo records:

- 20–30 products
- 5 suppliers
- 10 customers
- several purchase orders
- several quotations
- several sales orders
- invoices with mixed payment statuses

Do not use real customer personal information.
