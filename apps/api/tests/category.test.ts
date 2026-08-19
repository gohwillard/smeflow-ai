import "dotenv/config";

import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { UserRole } from "../src/generated/prisma/client.js";
import { signAccessToken } from "../src/shared/security/jwt.js";
import { hashPassword } from "../src/shared/security/password.js";

const runId = randomUUID();
const marker = `Phase 3C Category ${runId}`;
const emailMarker = `phase3c-category-${runId}`;

let companyAId = "";
let companyBId = "";
let companyBCategoryId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

process.env.JWT_SECRET = "phase-3c-category-test-secret-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function categoryInput(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    description: "Test category description",
    ...overrides,
  };
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 3C category test password");
  const companyA = await prisma.company.create({
    data: {
      name: `${marker} Company A`,
      users: {
        create: [
          {
            email: `${emailMarker}-owner@example.com`,
            passwordHash,
            firstName: "Owner",
            lastName: "User",
            role: UserRole.OWNER,
          },
          {
            email: `${emailMarker}-admin@example.com`,
            passwordHash,
            firstName: "Admin",
            lastName: "User",
            role: UserRole.ADMIN,
          },
          {
            email: `${emailMarker}-staff@example.com`,
            passwordHash,
            firstName: "Staff",
            lastName: "User",
            role: UserRole.STAFF,
          },
        ],
      },
    },
    include: { users: true },
  });
  const companyB = await prisma.company.create({
    data: {
      name: `${marker} Company B`,
      users: {
        create: {
          email: `${emailMarker}-company-b-owner@example.com`,
          passwordHash,
          firstName: "Other",
          lastName: "Owner",
          role: UserRole.OWNER,
        },
      },
      categories: {
        create: { name: "Company B Private Category" },
      },
    },
    include: { categories: true },
  });

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  if (!owner || !admin || !staff || !companyB.categories[0]) {
    throw new Error("Category test setup failed");
  }

  companyAId = companyA.id;
  companyBId = companyB.id;
  companyBCategoryId = companyB.categories[0].id;
  ({ accessToken: ownerToken } = await signAccessToken({
    userId: owner.id,
    companyId: companyA.id,
    role: owner.role,
  }));
  ({ accessToken: adminToken } = await signAccessToken({
    userId: admin.id,
    companyId: companyA.id,
    role: admin.role,
  }));
  ({ accessToken: staffToken } = await signAccessToken({
    userId: staff.id,
    companyId: companyA.id,
    role: staff.role,
  }));
});

afterAll(async () => {
  await prisma.product.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.category.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: emailMarker } },
  });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("Category API", () => {
  it("allows an OWNER to create a normalized Category with safe fields", async () => {
    const response = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", bearer(ownerToken))
      .send(categoryInput("  Electrical  ", { description: "   " }))
      .expect(201);

    expect(response.body).toEqual({
      status: "success",
      data: {
        category: {
          id: expect.any(String),
          name: "Electrical",
          description: null,
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
    expect(response.body.data.category).not.toHaveProperty("companyId");
    expect(
      await prisma.category.findFirst({
        where: { id: response.body.data.category.id, companyId: companyAId },
      }),
    ).not.toBeNull();
  });

  it.each([
    ["blank name", categoryInput("   ")],
    ["unknown field", categoryInput("Unknown Field", { unexpected: true })],
    ["companyId", categoryInput("Tenant Override", { companyId: companyBId })],
    ["isActive", categoryInput("Lifecycle Override", { isActive: false })],
  ])("rejects invalid create input: %s", async (_label, body) => {
    const response = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", bearer(ownerToken))
      .send(body)
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects exact and differently-cased duplicate names in one Company", async () => {
    await request(app)
      .post("/api/v1/categories")
      .set("Authorization", bearer(ownerToken))
      .send(categoryInput("Duplicate Category"))
      .expect(201);

    for (const name of ["Duplicate Category", "duplicate category"]) {
      const response = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", bearer(ownerToken))
        .send(categoryInput(name))
        .expect(409);
      expect(response.body.error.code).toBe("CATEGORY_ALREADY_EXISTS");
    }
  });

  it("allows the same normalized Category name in different Companies", async () => {
    await prisma.category.create({
      data: { companyId: companyBId, name: "Shared Category Name" },
    });

    await request(app)
      .post("/api/v1/categories")
      .set("Authorization", bearer(ownerToken))
      .send(categoryInput("shared category name"))
      .expect(201);
  });

  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to list and retrieve only Company A Categories", async (_role, token) => {
    const created = await prisma.category.create({
      data: { companyId: companyAId, name: `${marker} Read ${_role}` },
    });
    const listResponse = await request(app)
      .get("/api/v1/categories")
      .set("Authorization", bearer(token()))
      .expect(200);

    expect(
      listResponse.body.data.categories.some(
        (category: { id: string }) => category.id === created.id,
      ),
    ).toBe(true);
    expect(
      listResponse.body.data.categories.some(
        (category: { id: string }) => category.id === companyBCategoryId,
      ),
    ).toBe(false);

    const getResponse = await request(app)
      .get(`/api/v1/categories/${created.id}`)
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(getResponse.body.data.category.id).toBe(created.id);
  });

  it("allows an OWNER to update and reactivate a Category", async () => {
    const category = await prisma.category.create({
      data: {
        companyId: companyAId,
        name: `${marker} Owner Update`,
        isActive: false,
      },
    });
    const response = await request(app)
      .patch(`/api/v1/categories/${category.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ name: "  Owner Updated  ", description: "  New description  ", isActive: true })
      .expect(200);

    expect(response.body.data.category).toMatchObject({
      name: "Owner Updated",
      description: "New description",
      isActive: true,
    });
  });

  it("allows an ADMIN to create, update, and archive a Category", async () => {
    const created = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", bearer(adminToken))
      .send(categoryInput(`${marker} Admin CRUD`))
      .expect(201);
    const categoryId = created.body.data.category.id as string;

    await request(app)
      .patch(`/api/v1/categories/${categoryId}`)
      .set("Authorization", bearer(adminToken))
      .send({ description: "Admin updated" })
      .expect(200);
    const archived = await request(app)
      .delete(`/api/v1/categories/${categoryId}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(archived.body.data.category.isActive).toBe(false);
  });

  it("returns a conflict when an update duplicates another Category name", async () => {
    const [first, second] = await Promise.all([
      prisma.category.create({
        data: { companyId: companyAId, name: `${marker} Update Target One` },
      }),
      prisma.category.create({
        data: { companyId: companyAId, name: `${marker} Update Target Two` },
      }),
    ]);
    const response = await request(app)
      .patch(`/api/v1/categories/${second.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ name: first.name.toUpperCase() })
      .expect(409);
    expect(response.body.error.code).toBe("CATEGORY_ALREADY_EXISTS");
  });

  it("archives idempotently without deleting the Category or its Product relationship", async () => {
    const category = await prisma.category.create({
      data: { companyId: companyAId, name: `${marker} Archive Relationship` },
    });
    const product = await prisma.product.create({
      data: {
        companyId: companyAId,
        categoryId: category.id,
        sku: `CATEGORY-REL-${runId}`.toUpperCase(),
        name: "Related Product",
        unit: "pcs",
        costPrice: "1.00",
        sellingPrice: "2.00",
      },
    });

    await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const repeated = await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);

    expect(repeated.body.data.category.isActive).toBe(false);
    expect(await prisma.category.findUnique({ where: { id: category.id } })).not.toBeNull();
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.categoryId).toBe(category.id);
  });

  it.each(["post", "patch", "delete"] as const)(
    "forbids STAFF Category mutations through %s",
    async (method) => {
      const category = await prisma.category.create({
        data: { companyId: companyAId, name: `${marker} Staff ${method}` },
      });
      const path = method === "post" ? "/api/v1/categories" : `/api/v1/categories/${category.id}`;
      const body = method === "post" ? categoryInput(`${marker} Staff Create`) : { name: `${marker} Staff Changed` };
      const response = await request(app)[method](path)
        .set("Authorization", bearer(staffToken))
        .send(body)
        .expect(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    },
  );

  it.each([
    ["get", "read"],
    ["patch", "update"],
    ["delete", "archive"],
  ] as const)("hides Company B Category during %s", async (method) => {
    const response = await request(app)[method](`/api/v1/categories/${companyBCategoryId}`)
      .set("Authorization", bearer(ownerToken))
      .send(method === "patch" ? { name: "Cross Tenant Change" } : undefined)
      .expect(404);
    expect(response.body.error.code).toBe("CATEGORY_NOT_FOUND");
  });

  it("rejects malformed Category IDs", async () => {
    const response = await request(app)
      .get("/api/v1/categories/not-a-uuid")
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["get", "post", "patch", "delete"] as const)(
    "requires authentication for %s",
    async (method) => {
      const path = method === "get" || method === "post" ? "/api/v1/categories" : `/api/v1/categories/${randomUUID()}`;
      const response = await request(app)[method](path)
        .send(method === "post" ? categoryInput(`${marker} Unauthenticated`) : {})
        .expect(401);
      expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    },
  );
});
