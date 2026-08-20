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
const emailMarker = `phase3f-product-${runId}`;

let companyAId = "";
let companyBId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";
let companyBProductId = "";

const productIds: Record<string, string> = {};

process.env.JWT_SECRET = "phase-3f-product-test-secret-with-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function listedIds(response: request.Response): string[] {
  return response.body.data.products.map((product: { id: string }) => product.id);
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 3F product search test password");
  const companyA = await prisma.company.create({
    data: {
      name: `Phase 3F Product Search ${runId} Company A`,
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
      name: `Phase 3F Product Search ${runId} Company B`,
      users: {
        create: {
          email: `${emailMarker}-company-b@example.com`,
          passwordHash,
          firstName: "Other",
          lastName: "Owner",
          role: UserRole.OWNER,
        },
      },
    },
  });

  companyAId = companyA.id;
  companyBId = companyB.id;

  const products = await Promise.all([
    prisma.product.create({
      data: {
        companyId: companyAId,
        sku: "DRILL-001",
        name: "Cordless Drill",
        unit: "PCS",
        costPrice: "10.00",
        sellingPrice: "15.00",
        quantityOnHand: "2.000",
        reorderLevel: "5.000",
      },
    }),
    prisma.product.create({
      data: {
        companyId: companyAId,
        sku: "DRILL-002",
        name: "Cordless Drill Pro",
        unit: "PCS",
        costPrice: "20.00",
        sellingPrice: "30.00",
        quantityOnHand: "10.000",
        reorderLevel: "5.000",
      },
    }),
    prisma.product.create({
      data: {
        companyId: companyAId,
        sku: "HAMMER-001",
        name: "Claw Hammer",
        unit: "PCS",
        costPrice: "5.00",
        sellingPrice: "8.00",
        quantityOnHand: "1.000",
        reorderLevel: "5.000",
      },
    }),
    prisma.product.create({
      data: {
        companyId: companyAId,
        sku: "EXACT-005",
        name: "Exact Threshold Item",
        unit: "PCS",
        costPrice: "5.00",
        sellingPrice: "8.00",
        quantityOnHand: "5.000",
        reorderLevel: "5.000",
      },
    }),
    prisma.product.create({
      data: {
        companyId: companyAId,
        sku: "ZERO-000",
        name: "Zero Reorder Item",
        unit: "PCS",
        costPrice: "1.00",
        sellingPrice: "2.00",
        quantityOnHand: "0.000",
        reorderLevel: "0.000",
      },
    }),
    prisma.product.create({
      data: {
        companyId: companyAId,
        sku: "OLD-001",
        name: "Archived Old Drill",
        unit: "PCS",
        costPrice: "1.00",
        sellingPrice: "2.00",
        quantityOnHand: "0.000",
        reorderLevel: "5.000",
        isActive: false,
      },
    }),
    prisma.product.create({
      data: {
        companyId: companyBId,
        sku: "DRILL-PRIVATE",
        name: "Private Low Drill",
        unit: "PCS",
        costPrice: "1.00",
        sellingPrice: "2.00",
        quantityOnHand: "0.000",
        reorderLevel: "5.000",
      },
    }),
  ]);

  [
    "lowDrill",
    "highDrill",
    "lowHammer",
    "equalStock",
    "zeroStock",
    "archived",
  ].forEach((key, index) => {
    productIds[key] = products[index]!.id;
  });
  companyBProductId = products[6]!.id;

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  if (!owner || !admin || !staff) throw new Error("Phase 3F test setup failed");

  ({ accessToken: ownerToken } = await signAccessToken({
    userId: owner.id,
    companyId: companyAId,
    role: owner.role,
  }));
  ({ accessToken: adminToken } = await signAccessToken({
    userId: admin.id,
    companyId: companyAId,
    role: admin.role,
  }));
  ({ accessToken: staffToken } = await signAccessToken({
    userId: staff.id,
    companyId: companyAId,
    role: staff.role,
  }));
});

afterAll(async () => {
  await prisma.product.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: emailMarker } } });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("Phase 3F Product search", () => {
  it("rejects unauthenticated Product search", async () => {
    await request(app).get("/api/v1/products?search=drill").expect(401);
  });

  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to search Products", async (_role, token) => {
    const response = await request(app)
      .get("/api/v1/products?search=DRILL-001")
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(listedIds(response)).toContain(productIds.lowDrill);
  });

  it.each([
    ["exact SKU", "DRILL-001", "lowDrill"],
    ["partial SKU", "drill-0", "lowDrill"],
    ["case-insensitive SKU", "dRiLl-001", "lowDrill"],
    ["exact Product name", "Cordless Drill", "lowDrill"],
    ["partial Product name", "less dri", "lowDrill"],
    ["case-insensitive Product name", "cOrDlEsS", "lowDrill"],
  ])("matches a %s", async (_label, search, expectedKey) => {
    const response = await request(app)
      .get("/api/v1/products")
      .query({ search })
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toContain(productIds[expectedKey]);
  });

  it("trims search whitespace", async () => {
    const response = await request(app)
      .get("/api/v1/products")
      .query({ search: "   DRILL-001   " })
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([productIds.lowDrill]);
  });

  it("returns an empty list when search has no match", async () => {
    const response = await request(app)
      .get("/api/v1/products?search=does-not-exist")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(response.body.data.products).toEqual([]);
  });

  it("keeps search Company-scoped", async () => {
    const response = await request(app)
      .get("/api/v1/products?search=private")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).not.toContain(companyBProductId);
    expect(response.body.data.products).toEqual([]);
  });

  it("includes an archived matching Product during normal search", async () => {
    const response = await request(app)
      .get("/api/v1/products?search=old-001")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([productIds.archived]);
  });

  it("does not alter Product data while searching", async () => {
    const before = await prisma.product.findUniqueOrThrow({
      where: { id: productIds.lowDrill },
    });
    await request(app)
      .get("/api/v1/products?search=drill")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: productIds.lowDrill },
    });
    expect(after).toEqual(before);
  });

  it.each([
    ["unknown parameter", { categoryId: randomUUID() }],
    ["client-selected Company", { companyId: companyBId }],
    ["repeated search", { search: ["drill", "hammer"] }],
    ["overlong search", { search: "x".repeat(201) }],
  ])("rejects invalid Product query input: %s", async (_label, query) => {
    const response = await request(app)
      .get("/api/v1/products")
      .query(query)
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Phase 3F low-stock filtering", () => {
  it("applies the exact active-and-at-or-below-reorder rule in PostgreSQL", async () => {
    const response = await request(app)
      .get("/api/v1/products?lowStock=true")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const ids = listedIds(response);

    expect(ids).toContain(productIds.lowDrill);
    expect(ids).toContain(productIds.equalStock);
    expect(ids).toContain(productIds.zeroStock);
    expect(ids).toContain(productIds.lowHammer);
    expect(ids).not.toContain(productIds.highDrill);
    expect(ids).not.toContain(productIds.archived);
  });

  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to filter low-stock Products", async (_role, token) => {
    const response = await request(app)
      .get("/api/v1/products?lowStock=true")
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(listedIds(response)).toContain(productIds.lowDrill);
  });

  it("keeps the low-stock filter Company-scoped", async () => {
    const response = await request(app)
      .get("/api/v1/products?lowStock=true")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).not.toContain(companyBProductId);
  });

  it.each(["false", "1", "yes", "abc"])(
    "rejects lowStock=%s",
    async (lowStock) => {
      const response = await request(app)
        .get("/api/v1/products")
        .query({ lowStock })
        .set("Authorization", bearer(ownerToken))
        .expect(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("preserves the normal active-and-archived list when lowStock is absent", async () => {
    const response = await request(app)
      .get("/api/v1/products")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const ids = listedIds(response);
    expect(Object.values(productIds).every((id) => ids.includes(id))).toBe(true);
    expect(ids).not.toContain(companyBProductId);
  });
});

describe("Phase 3F combined Product filters", () => {
  it("combines search and lowStock with AND semantics", async () => {
    const response = await request(app)
      .get("/api/v1/products?search=drill&lowStock=true")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([productIds.lowDrill]);
  });

  it("keeps combined filters Company-scoped and excludes archived matches", async () => {
    const privateResponse = await request(app)
      .get("/api/v1/products?search=private&lowStock=true")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const archivedResponse = await request(app)
      .get("/api/v1/products?search=old-001&lowStock=true")
      .set("Authorization", bearer(ownerToken))
      .expect(200);

    expect(privateResponse.body.data.products).toEqual([]);
    expect(archivedResponse.body.data.products).toEqual([]);
  });
});
