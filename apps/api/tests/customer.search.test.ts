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
const emailMarker = `phase4e-customer-${runId}`;

let companyAId = "";
let companyBId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

const customerIds: Record<string, string> = {};

process.env.JWT_SECRET = "phase-4e-customer-test-secret-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function listedIds(response: request.Response): string[] {
  return response.body.data.customers.map(
    (customer: { id: string }) => customer.id,
  );
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 4E customer test password");
  const companyA = await prisma.company.create({
    data: {
      name: `Phase 4E Customer ${runId} Company A`,
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
      name: `Phase 4E Customer ${runId} Company B`,
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

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        companyId: companyAId,
        name: "Alice Hardware Trading",
        registrationNumber: "1234567-X",
        contactPerson: "Amina Search Contact",
        email: "alice@example.com",
        phone: "+60 12 345 6789",
        billingAddress: "Hidden Billing Search Token",
        shippingAddress: "Hidden Shipping Search Token",
        notes: "Hidden Notes Search Token",
      },
    }),
    prisma.customer.create({
      data: {
        companyId: companyAId,
        name: "Secret Active Customer",
        registrationNumber: "ACTIVE-REG",
      },
    }),
    prisma.customer.create({
      data: {
        companyId: companyAId,
        name: "Secret Archived Customer",
        registrationNumber: "ARCHIVE-REG",
        isActive: false,
      },
    }),
    prisma.customer.create({
      data: {
        companyId: companyAId,
        name: "Ordinary Archived Buyer",
        isActive: false,
      },
    }),
    prisma.customer.create({
      data: {
        companyId: companyBId,
        name: "Company B Secret Customer",
        registrationNumber: "1234567-X",
        contactPerson: "Amina Search Contact",
        email: "alice@example.com",
        phone: "+60 12 345 6789",
      },
    }),
  ]);

  ["alice", "activeSecret", "archivedSecret", "archived", "companyB"].forEach(
    (key, index) => {
      customerIds[key] = customers[index]!.id;
    },
  );

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  if (!owner || !admin || !staff) {
    throw new Error("Phase 4E Customer test setup failed");
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
  await prisma.customer.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: emailMarker } } });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("Phase 4E Customer search", () => {
  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to search Customers", async (_role, token) => {
    const response = await request(app)
      .get("/api/v1/customers?search=alice")
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(listedIds(response)).toContain(customerIds.alice);
  });

  it.each([
    ["name", "Hardware", "alice"],
    ["partial name", "ice Hard", "alice"],
    ["case-insensitive name", "ALICE HARDWARE", "alice"],
    ["registration number", "34567", "alice"],
    ["contact person", "search contact", "alice"],
    ["email", "@EXAMPLE", "alice"],
    ["phone", "12 345", "alice"],
  ])("matches Customer %s", async (_label, search, expectedKey) => {
    const response = await request(app)
      .get("/api/v1/customers")
      .query({ search })
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([customerIds[expectedKey]]);
  });

  it("trims Customer search whitespace", async () => {
    const response = await request(app)
      .get("/api/v1/customers")
      .query({ search: "   alice hardware   " })
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([customerIds.alice]);
  });

  it("includes archived Customers when status is omitted", async () => {
    const response = await request(app)
      .get("/api/v1/customers?search=secret")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toHaveLength(2);
    expect(listedIds(response)).toEqual(
      expect.arrayContaining([
        customerIds.activeSecret,
        customerIds.archivedSecret,
      ]),
    );
  });

  it.each(["billing", "shipping", "notes"])(
    "does not search Customer %s text",
    async (search) => {
      const response = await request(app)
        .get("/api/v1/customers")
        .query({ search: `Hidden ${search[0]!.toUpperCase()}${search.slice(1)} Search Token` })
        .set("Authorization", bearer(ownerToken))
        .expect(200);
      expect(response.body.data.customers).toEqual([]);
    },
  );
});

describe("Phase 4E Customer lifecycle filtering", () => {
  it("returns only active Customers for status=active", async () => {
    const response = await request(app)
      .get("/api/v1/customers?status=active")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const ids = listedIds(response);
    expect(ids).toContain(customerIds.alice);
    expect(ids).toContain(customerIds.activeSecret);
    expect(ids).not.toContain(customerIds.archivedSecret);
    expect(ids).not.toContain(customerIds.companyB);
  });

  it("returns only archived Customers for status=archived", async () => {
    const response = await request(app)
      .get("/api/v1/customers?status=archived")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toHaveLength(2);
    expect(listedIds(response)).toEqual(
      expect.arrayContaining([
        customerIds.archivedSecret,
        customerIds.archived,
      ]),
    );
  });

  it("omits lifecycle filtering when status is absent", async () => {
    const response = await request(app)
      .get("/api/v1/customers")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toHaveLength(4);
    expect(listedIds(response)).toEqual(
      expect.arrayContaining([
        customerIds.alice,
        customerIds.activeSecret,
        customerIds.archivedSecret,
        customerIds.archived,
      ]),
    );
  });
});

describe("Phase 4E combined Customer filters and isolation", () => {
  it("combines Customer search and active status with AND semantics", async () => {
    const response = await request(app)
      .get("/api/v1/customers?search=secret&status=active")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([customerIds.activeSecret]);
  });

  it("combines Customer search and archived status with AND semantics", async () => {
    const response = await request(app)
      .get("/api/v1/customers?search=secret&status=archived")
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).toEqual([customerIds.archivedSecret]);
  });

  it.each([
    ["search", "/api/v1/customers?search=company+b"],
    ["status", "/api/v1/customers?status=active"],
    ["combined", "/api/v1/customers?search=company+b&status=active"],
  ])("excludes Company B Customers from %s results", async (_label, path) => {
    const response = await request(app)
      .get(path)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(listedIds(response)).not.toContain(customerIds.companyB);
  });
});

describe("Phase 4E Customer query validation", () => {
  it.each(["all", "true", "false", "1", "ACTIVE", "inactive", "deleted", ""])(
    "rejects unsupported Customer status=%s",
    async (status) => {
      const response = await request(app)
        .get("/api/v1/customers")
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
  ])("rejects unsupported Customer query parameter %s", async (parameter) => {
    const response = await request(app)
      .get("/api/v1/customers")
      .query({ [parameter]: parameter === "companyId" ? companyBId : "1" })
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["empty", { search: "" }],
    ["blank", { search: "   " }],
    ["overlong", { search: "x".repeat(321) }],
    ["control character", { search: "alice\ncustomer" }],
    ["repeated", { search: ["alice", "secret"] }],
  ])("rejects invalid Customer search: %s", async (_label, query) => {
    const response = await request(app)
      .get("/api/v1/customers")
      .query(query)
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
