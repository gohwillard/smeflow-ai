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
const emailMarker = `phase4e-supplier-${runId}`;

let companyAId = "";
let companyBId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

const supplierIds: Record<string, string> = {};

process.env.JWT_SECRET = "phase-4e-supplier-test-secret-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function listedIds(response: request.Response): string[] {
  return response.body.data.suppliers.map(
    (supplier: { id: string }) => supplier.id,
  );
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 4E supplier test password");
  const companyA = await prisma.company.create({
    data: {
      name: `Phase 4E Supplier ${runId} Company A`,
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
      name: `Phase 4E Supplier ${runId} Company B`,
      users: {
        create: {
          email: `${emailMarker}-other@example.com`,
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

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        companyId: companyAId,
        name: "Alpha Industrial Supplies",
        registrationNumber: "7654321-Z",
        contactPerson: "Daniel Search Contact",
        email: "orders@alpha.example",
        phone: "+60 3 9876 5432",
        address: "Hidden Address Search Token",
        notes: "Hidden Notes Search Token",
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: companyAId,
        name: "Secret Active Supplier",
        registrationNumber: "ACTIVE-SUP",
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: companyAId,
        name: "Secret Archived Supplier",
        registrationNumber: "ARCHIVED-SUP",
        isActive: false,
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: companyAId,
        name: "Ordinary Archived Vendor",
        isActive: false,
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: companyBId,
        name: "Company B Secret Supplier",
        registrationNumber: "7654321-Z",
        contactPerson: "Daniel Search Contact",
        email: "orders@alpha.example",
        phone: "+60 3 9876 5432",
      },
    }),
  ]);

  ["alpha", "activeSecret", "archivedSecret", "archived", "companyB"].forEach(
    (key, index) => {
      supplierIds[key] = suppliers[index]!.id;
    },
  );

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  if (!owner || !admin || !staff) {
    throw new Error("Phase 4E Supplier test setup failed");
  }

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
  await prisma.supplier.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: emailMarker } } });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("Phase 4E Supplier search", () => {
  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to search Suppliers", async (_role, token) => {
    const response = await request(app)
      .get("/api/v1/suppliers?search=alpha")
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(listedIds(response)).toContain(supplierIds.alpha);
  });

  it.each([
    ["name", "Industrial", "alpha"],
    ["partial name", "pha Ind", "alpha"],
    ["case-insensitive name", "ALPHA INDUSTRIAL", "alpha"],
    ["registration number", "54321", "alpha"],
    ["contact person", "search contact", "alpha"],
    ["email", "@ALPHA", "alpha"],
    ["phone", "9876 54", "alpha"],
  ])("matches Supplier %s", async (_label, search, expectedKey) => {
    const response = await request(app)
      .get("/api/v1/suppliers")
      .query({ search })
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([supplierIds[expectedKey]]);
  });

  it("trims Supplier search whitespace", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers")
      .query({ search: "   alpha industrial   " })
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([supplierIds.alpha]);
  });

  it("includes archived Suppliers when status is omitted", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers?search=secret")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toHaveLength(2);
    expect(listedIds(response)).toEqual(
      expect.arrayContaining([
        supplierIds.activeSecret,
        supplierIds.archivedSecret,
      ]),
    );
  });

  it.each(["address", "notes"])(
    "does not search Supplier %s text",
    async (search) => {
      const response = await request(app)
        .get("/api/v1/suppliers")
        .query({ search: `Hidden ${search[0]!.toUpperCase()}${search.slice(1)} Search Token` })
        .set("Authorization", bearer(ownerToken))
        .expect(200);
      expect(response.body.data.suppliers).toEqual([]);
    },
  );
});

describe("Phase 4E Supplier lifecycle filtering", () => {
  it("returns only active Suppliers for status=active", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers?status=active")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const ids = listedIds(response);
    expect(ids).toContain(supplierIds.alpha);
    expect(ids).toContain(supplierIds.activeSecret);
    expect(ids).not.toContain(supplierIds.archivedSecret);
    expect(ids).not.toContain(supplierIds.companyB);
  });

  it("returns only archived Suppliers for status=archived", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers?status=archived")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toHaveLength(2);
    expect(listedIds(response)).toEqual(
      expect.arrayContaining([
        supplierIds.archivedSecret,
        supplierIds.archived,
      ]),
    );
  });

  it("omits lifecycle filtering when status is absent", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toHaveLength(4);
    expect(listedIds(response)).toEqual(
      expect.arrayContaining([
        supplierIds.alpha,
        supplierIds.activeSecret,
        supplierIds.archivedSecret,
        supplierIds.archived,
      ]),
    );
  });
});

describe("Phase 4E combined Supplier filters and isolation", () => {
  it("combines Supplier search and active status with AND semantics", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers?search=secret&status=active")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([supplierIds.activeSecret]);
  });

  it("combines Supplier search and archived status with AND semantics", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers?search=secret&status=archived")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([supplierIds.archivedSecret]);
  });

  it.each([
    ["search", "/api/v1/suppliers?search=company+b"],
    ["status", "/api/v1/suppliers?status=active"],
    ["combined", "/api/v1/suppliers?search=company+b&status=active"],
  ])("excludes Company B Suppliers from %s results", async (_label, path) => {
    const response = await request(app)
      .get(path)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).not.toContain(supplierIds.companyB);
  });
});

describe("Phase 4E Supplier query validation", () => {
  it.each(["all", "true", "false", "1", "ACTIVE", "inactive", "deleted", ""])(
    "rejects unsupported Supplier status=%s",
    async (status) => {
      const response = await request(app)
        .get("/api/v1/suppliers")
        .query({ status })
        .set("Authorization", bearer(ownerToken))
        .expect(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it.each([
    "companyId",
    "page",
    "limit",
    "offset",
    "sort",
    "order",
    "active",
    "isActive",
    "lowStock",
    "unknown",
  ])("rejects unsupported Supplier query parameter %s", async (parameter) => {
    const response = await request(app)
      .get("/api/v1/suppliers")
      .query({ [parameter]: parameter === "companyId" ? companyBId : "1" })
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["empty", { search: "" }],
    ["blank", { search: "   " }],
    ["overlong", { search: "x".repeat(321) }],
    ["control character", { search: "alpha\nsupplier" }],
    ["repeated", { search: ["alpha", "secret"] }],
  ])("rejects invalid Supplier search: %s", async (_label, query) => {
    const response = await request(app)
      .get("/api/v1/suppliers")
      .query(query)
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
