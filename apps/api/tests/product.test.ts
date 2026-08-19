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
const marker = `Phase 3C Product ${runId}`;
const emailMarker = `phase3c-product-${runId}`;

let companyAId = "";
let companyBId = "";
let activeCategoryId = "";
let inactiveCategoryId = "";
let companyBCategoryId = "";
let companyBProductId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

process.env.JWT_SECRET = "phase-3c-product-test-secret-with-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function sku(label: string): string {
  return `${label}-${runId}`.toUpperCase();
}

function productInput(
  productSku: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    sku: productSku,
    name: "Test Product",
    description: "Test product description",
    unit: "pcs",
    costPrice: "10.25",
    sellingPrice: "15.99",
    reorderLevel: "1.500",
    ...overrides,
  };
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 3C product test password");
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
      categories: {
        create: [
          { name: `${marker} Active Category` },
          { name: `${marker} Inactive Category`, isActive: false },
        ],
      },
    },
    include: { users: true, categories: true },
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
        create: { name: `${marker} Company B Category` },
      },
      products: {
        create: {
          sku: sku("COMPANY-B-PRIVATE"),
          name: "Company B Private Product",
          unit: "pcs",
          costPrice: "1.00",
          sellingPrice: "2.00",
        },
      },
    },
    include: { categories: true, products: true },
  });

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  const activeCategory = companyA.categories.find((category) => category.isActive);
  const inactiveCategory = companyA.categories.find(
    (category) => !category.isActive,
  );
  if (
    !owner ||
    !admin ||
    !staff ||
    !activeCategory ||
    !inactiveCategory ||
    !companyB.categories[0] ||
    !companyB.products[0]
  ) {
    throw new Error("Product test setup failed");
  }

  companyAId = companyA.id;
  companyBId = companyB.id;
  activeCategoryId = activeCategory.id;
  inactiveCategoryId = inactiveCategory.id;
  companyBCategoryId = companyB.categories[0].id;
  companyBProductId = companyB.products[0].id;
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

describe("Product API", () => {
  it("creates an uncategorized Product at zero stock with exact decimal strings", async () => {
    const response = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(`  ${sku("create-normalized").toLowerCase()}  `, { description: "   " }))
      .expect(201);

    expect(response.body).toEqual({
      status: "success",
      data: {
        product: {
          id: expect.any(String),
          categoryId: null,
          sku: sku("CREATE-NORMALIZED"),
          name: "Test Product",
          description: null,
          unit: "pcs",
          costPrice: "10.25",
          sellingPrice: "15.99",
          quantityOnHand: "0.000",
          reorderLevel: "1.500",
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
    expect(response.body.data.product).not.toHaveProperty("companyId");
  });

  it("creates a Product with a same-Company active Category and zero defaults", async () => {
    const response = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(
        productInput(sku("ACTIVE-CATEGORY"), {
          categoryId: activeCategoryId,
          reorderLevel: undefined,
        }),
      )
      .expect(201);

    expect(response.body.data.product).toMatchObject({
      categoryId: activeCategoryId,
      quantityOnHand: "0.000",
      reorderLevel: "0.000",
    });
  });

  it.each([
    ["quantityOnHand", { quantityOnHand: "5.000" }],
    ["companyId", { companyId: companyBId }],
    ["isActive", { isActive: false }],
    ["unknown field", { unexpected: true }],
    ["blank SKU", { sku: "   " }],
    ["blank name", { name: "   " }],
    ["blank unit", { unit: "   " }],
    ["control-character unit", { unit: "\u0001" }],
    ["negative cost price", { costPrice: "-0.01" }],
    ["negative selling price", { sellingPrice: "-0.01" }],
    ["negative reorder level", { reorderLevel: "-0.001" }],
    ["unsafe numeric money input", { costPrice: 10.25 }],
    ["excess money scale", { sellingPrice: "1.999" }],
    ["excess quantity scale", { reorderLevel: "1.0001" }],
  ])("rejects invalid create input: %s", async (label, override) => {
    const response = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(sku(`INVALID-${label.replaceAll(" ", "-")}`), override))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("normalizes duplicate SKUs and returns a safe conflict", async () => {
    await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(sku("DUPLICATE")))
      .expect(201);
    const response = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(`  ${sku("DUPLICATE").toLowerCase()}  `))
      .expect(409);
    expect(response.body.error.code).toBe("SKU_ALREADY_EXISTS");
  });

  it("allows the same normalized SKU in different Companies", async () => {
    await prisma.product.create({
      data: {
        companyId: companyBId,
        sku: sku("SHARED-SKU"),
        name: "Company B Shared SKU",
        unit: "pcs",
        costPrice: "1.00",
        sellingPrice: "2.00",
      },
    });
    await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(sku("SHARED-SKU")))
      .expect(201);
  });

  it("keeps an archived Product SKU reserved", async () => {
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(sku("ARCHIVED-RESERVED")))
      .expect(201);
    await request(app)
      .delete(`/api/v1/products/${created.body.data.product.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const response = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(sku("ARCHIVED-RESERVED")))
      .expect(409);
    expect(response.body.error.code).toBe("SKU_ALREADY_EXISTS");
  });

  it.each([
    ["another Company's", () => companyBCategoryId],
    ["an inactive", () => inactiveCategoryId],
  ])("rejects assignment to %s Category without revealing it", async (_label, categoryId) => {
    const response = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .send(productInput(sku(`UNAVAILABLE-${_label}`), { categoryId: categoryId() }))
      .expect(400);
    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "CATEGORY_UNAVAILABLE",
        message: "Category is unavailable for assignment",
      },
    });
  });

  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to list and retrieve only Company A Products", async (role, token) => {
    const product = await prisma.product.create({
      data: {
        companyId: companyAId,
        sku: sku(`READ-${role}`),
        name: `${role} Read Product`,
        unit: "box",
        costPrice: "10.25",
        sellingPrice: "15.99",
        reorderLevel: "1.500",
      },
    });
    const listResponse = await request(app)
      .get("/api/v1/products")
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(
      listResponse.body.data.products.some(
        (listed: { id: string }) => listed.id === product.id,
      ),
    ).toBe(true);
    expect(
      listResponse.body.data.products.some(
        (listed: { id: string }) => listed.id === companyBProductId,
      ),
    ).toBe(false);

    const getResponse = await request(app)
      .get(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(getResponse.body.data.product).toMatchObject({
      id: product.id,
      costPrice: "10.25",
      sellingPrice: "15.99",
      quantityOnHand: "0.000",
      reorderLevel: "1.500",
    });
  });

  it("allows an OWNER to update Product master data and normalize SKU", async () => {
    const product = await prisma.product.create({
      data: {
        companyId: companyAId,
        sku: sku("OWNER-UPDATE-BEFORE"),
        name: "Before Update",
        unit: "pcs",
        costPrice: "1.00",
        sellingPrice: "2.00",
      },
    });
    const response = await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({
        categoryId: activeCategoryId,
        sku: `  ${sku("OWNER-UPDATE-AFTER").toLowerCase()}  `,
        name: "  Updated Product  ",
        description: "   ",
        unit: "  box  ",
        costPrice: "20.50",
        sellingPrice: "25.75",
        reorderLevel: "2.250",
        isActive: false,
      })
      .expect(200);
    expect(response.body.data.product).toMatchObject({
      categoryId: activeCategoryId,
      sku: sku("OWNER-UPDATE-AFTER"),
      name: "Updated Product",
      description: null,
      unit: "box",
      costPrice: "20.50",
      sellingPrice: "25.75",
      quantityOnHand: "0.000",
      reorderLevel: "2.250",
      isActive: false,
    });
  });

  it("allows an ADMIN to create, update, and archive a Product", async () => {
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", bearer(adminToken))
      .send(productInput(sku("ADMIN-CRUD")))
      .expect(201);
    const productId = created.body.data.product.id as string;
    await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set("Authorization", bearer(adminToken))
      .send({ name: "Admin Updated Product" })
      .expect(200);
    const archived = await request(app)
      .delete(`/api/v1/products/${productId}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(archived.body.data.product.isActive).toBe(false);
  });

  it("rejects a duplicate normalized SKU during update", async () => {
    const [first, second] = await Promise.all([
      prisma.product.create({
        data: { companyId: companyAId, sku: sku("UPDATE-DUPLICATE-ONE"), name: "One", unit: "pcs", costPrice: "1", sellingPrice: "2" },
      }),
      prisma.product.create({
        data: { companyId: companyAId, sku: sku("UPDATE-DUPLICATE-TWO"), name: "Two", unit: "pcs", costPrice: "1", sellingPrice: "2" },
      }),
    ]);
    const response = await request(app)
      .patch(`/api/v1/products/${second.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ sku: ` ${first.sku.toLowerCase()} ` })
      .expect(409);
    expect(response.body.error.code).toBe("SKU_ALREADY_EXISTS");
  });

  it.each([
    ["quantityOnHand", { quantityOnHand: "99.000" }],
    ["companyId", { companyId: companyBId }],
    ["unknown field", { movementType: "MANUAL_IN" }],
  ])("rejects forbidden Product PATCH input: %s", async (_label, body) => {
    const product = await prisma.product.create({
      data: { companyId: companyAId, sku: sku(`PATCH-FORBIDDEN-${_label}`), name: "Forbidden Patch", unit: "pcs", costPrice: "1", sellingPrice: "2" },
    });
    const response = await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .send(body)
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects assigning an inactive Category but permits unrelated updates to a historical relationship", async () => {
    const product = await prisma.product.create({
      data: { companyId: companyAId, categoryId: inactiveCategoryId, sku: sku("HISTORICAL-INACTIVE"), name: "Historical Product", unit: "pcs", costPrice: "1", sellingPrice: "2" },
    });
    await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ categoryId: inactiveCategoryId })
      .expect(400);
    const response = await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ name: "Historical Product Updated" })
      .expect(200);
    expect(response.body.data.product.categoryId).toBe(inactiveCategoryId);
  });

  it("archives idempotently without changing stock or deleting the Product", async () => {
    const product = await prisma.product.create({
      data: {
        companyId: companyAId,
        sku: sku("ARCHIVE-STOCK"),
        name: "Stocked Product",
        unit: "kg",
        costPrice: "10.25",
        sellingPrice: "15.99",
        quantityOnHand: "7.500",
        reorderLevel: "1.500",
      },
    });
    await request(app)
      .delete(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const repeated = await request(app)
      .delete(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(repeated.body.data.product).toMatchObject({
      isActive: false,
      quantityOnHand: "7.500",
    });
    const stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored).not.toBeNull();
    expect(stored?.quantityOnHand.toFixed(3)).toBe("7.500");
  });

  it("reactivates an archived Product through PATCH without changing stock", async () => {
    const product = await prisma.product.create({
      data: {
        companyId: companyAId,
        sku: sku("REACTIVATE"),
        name: "Archived Product",
        unit: "pcs",
        costPrice: "1.00",
        sellingPrice: "2.00",
        quantityOnHand: "3.250",
        isActive: false,
      },
    });
    const response = await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ isActive: true })
      .expect(200);
    expect(response.body.data.product).toMatchObject({
      isActive: true,
      quantityOnHand: "3.250",
    });
  });

  it.each(["post", "patch", "delete"] as const)(
    "forbids STAFF Product mutations through %s",
    async (method) => {
      const product = await prisma.product.create({
        data: { companyId: companyAId, sku: sku(`STAFF-${method}`), name: "Staff Product", unit: "pcs", costPrice: "1", sellingPrice: "2" },
      });
      const path = method === "post" ? "/api/v1/products" : `/api/v1/products/${product.id}`;
      const body = method === "post" ? productInput(sku("STAFF-CREATE")) : { name: "Staff Changed" };
      const response = await request(app)[method](path)
        .set("Authorization", bearer(staffToken))
        .send(body)
        .expect(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    },
  );

  it.each(["get", "patch", "delete"] as const)(
    "hides a Company B Product during %s",
    async (method) => {
      const response = await request(app)[method](`/api/v1/products/${companyBProductId}`)
        .set("Authorization", bearer(ownerToken))
        .send(method === "patch" ? { name: "Cross Tenant Change" } : undefined)
        .expect(404);
      expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
    },
  );

  it("cannot update a Company A Product to a Company B Category", async () => {
    const product = await prisma.product.create({
      data: { companyId: companyAId, sku: sku("CROSS-CATEGORY-UPDATE"), name: "Cross Category", unit: "pcs", costPrice: "1", sellingPrice: "2" },
    });
    const response = await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ categoryId: companyBCategoryId })
      .expect(400);
    expect(response.body.error.code).toBe("CATEGORY_UNAVAILABLE");
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.categoryId).toBeNull();
  });

  it("rejects malformed Product IDs", async () => {
    const response = await request(app)
      .get("/api/v1/products/not-a-uuid")
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["get", "post", "patch", "delete"] as const)(
    "requires authentication for %s",
    async (method) => {
      const path = method === "get" || method === "post" ? "/api/v1/products" : `/api/v1/products/${randomUUID()}`;
      const response = await request(app)[method](path)
        .send(method === "post" ? productInput(sku("UNAUTHENTICATED")) : {})
        .expect(401);
      expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    },
  );
});
