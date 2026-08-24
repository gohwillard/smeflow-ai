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
const marker = `Phase 4C Supplier ${runId}`;
const emailMarker = `phase4c-supplier-${runId}`;

let companyAId = "";
let companyBId = "";
let companyBSupplierId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

process.env.JWT_SECRET = "phase-4c-supplier-test-secret-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function supplierInput(
  name: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    name,
    registrationNumber: "SUP-REG-100",
    contactPerson: "Supplier Contact",
    email: "supplier@example.com",
    phone: "+60 3-1234 5678",
    address: "Supplier address",
    notes: "Supplier notes",
    ...overrides,
  };
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 4C supplier test password");
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
      suppliers: {
        create: {
          name: "Company B Private Supplier",
          email: "private-supplier@example.com",
        },
      },
    },
    include: { suppliers: true },
  });

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  if (!owner || !admin || !staff || !companyB.suppliers[0]) {
    throw new Error("Supplier test setup failed");
  }

  companyAId = companyA.id;
  companyBId = companyB.id;
  companyBSupplierId = companyB.suppliers[0].id;
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
  await prisma.supplier.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: emailMarker } } });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("Supplier API", () => {
  it("allows an OWNER to create a normalized Supplier with only safe response fields", async () => {
    const response = await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", bearer(ownerToken))
      .send(
        supplierInput("  Meridian Wholesale  ", {
          registrationNumber: "  SUP-MY-100  ",
          contactPerson: "  Daniel Tan  ",
          email: "  ORDERS@MERIDIAN.EXAMPLE  ",
          phone: "  03-1234 5678  ",
          address: "  Warehouse 2\nSelangor  ",
          notes: "   ",
        }),
      )
      .expect(201);

    expect(response.body).toEqual({
      status: "success",
      data: {
        supplier: {
          id: expect.any(String),
          name: "Meridian Wholesale",
          registrationNumber: "SUP-MY-100",
          contactPerson: "Daniel Tan",
          email: "orders@meridian.example",
          phone: "03-1234 5678",
          address: "Warehouse 2\nSelangor",
          notes: null,
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
    expect(response.body.data.supplier).not.toHaveProperty("companyId");
    expect(response.body.data.supplier).not.toHaveProperty("company");

    const stored = await prisma.supplier.findUnique({
      where: { id: response.body.data.supplier.id },
    });
    expect(stored).toMatchObject({
      companyId: companyAId,
      email: "orders@meridian.example",
      notes: null,
      isActive: true,
    });
  });

  it("stores omitted optional Supplier fields as null", async () => {
    const response = await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", bearer(ownerToken))
      .send({ name: `${marker} Minimal` })
      .expect(201);

    expect(response.body.data.supplier).toMatchObject({
      registrationNumber: null,
      contactPerson: null,
      email: null,
      phone: null,
      address: null,
      notes: null,
    });
  });

  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to list and retrieve only Company A Suppliers", async (role, token) => {
    const supplier = await prisma.supplier.create({
      data: { companyId: companyAId, name: `${marker} Read ${role}` },
    });

    const listResponse = await request(app)
      .get("/api/v1/suppliers")
      .set("Authorization", bearer(token()))
      .expect(200);
    const listedIds = listResponse.body.data.suppliers.map(
      (listedSupplier: { id: string }) => listedSupplier.id,
    );
    expect(listedIds).toContain(supplier.id);
    expect(listedIds).not.toContain(companyBSupplierId);

    const detailResponse = await request(app)
      .get(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(detailResponse.body.data.supplier.id).toBe(supplier.id);
    expect(detailResponse.body.data.supplier).not.toHaveProperty("companyId");
  });

  it("applies partial PATCH semantics, null clearing, blank-to-null, and email lowercasing", async () => {
    const supplier = await prisma.supplier.create({
      data: {
        companyId: companyAId,
        name: `${marker} Patch`,
        registrationNumber: "KEEP-SUP-REG",
        contactPerson: "Clear Me",
        email: "old-supplier@example.com",
        phone: "0312345678",
        address: "Old address",
        notes: "Old notes",
      },
    });

    const response = await request(app)
      .patch(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({
        name: "  Updated Supplier  ",
        contactPerson: null,
        email: "  NEW-SUPPLIER@EXAMPLE.COM  ",
        phone: "   ",
        address: null,
        notes: "  New notes  ",
      })
      .expect(200);

    expect(response.body.data.supplier).toMatchObject({
      name: "Updated Supplier",
      registrationNumber: "KEEP-SUP-REG",
      contactPerson: null,
      email: "new-supplier@example.com",
      phone: null,
      address: null,
      notes: "New notes",
      isActive: true,
    });
  });

  it("allows an ADMIN to create, update, archive, and reactivate a Supplier", async () => {
    const created = await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", bearer(adminToken))
      .send(supplierInput(`${marker} Admin CRUD`))
      .expect(201);
    const supplierId = created.body.data.supplier.id as string;

    await request(app)
      .patch(`/api/v1/suppliers/${supplierId}`)
      .set("Authorization", bearer(adminToken))
      .send({ notes: "Admin updated" })
      .expect(200);
    await request(app)
      .delete(`/api/v1/suppliers/${supplierId}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    const reactivated = await request(app)
      .patch(`/api/v1/suppliers/${supplierId}`)
      .set("Authorization", bearer(adminToken))
      .send({ isActive: true })
      .expect(200);
    expect(reactivated.body.data.supplier.isActive).toBe(true);
  });

  it("archives idempotently without physically deleting and keeps archived detail readable", async () => {
    const supplier = await prisma.supplier.create({
      data: { companyId: companyAId, name: `${marker} Archive` },
    });

    const firstArchive = await request(app)
      .delete(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const secondArchive = await request(app)
      .delete(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);

    expect(firstArchive.body.data.supplier.id).toBe(supplier.id);
    expect(secondArchive.body.data.supplier).toMatchObject({
      id: supplier.id,
      isActive: false,
    });
    expect(await prisma.supplier.count({ where: { id: supplier.id } })).toBe(1);
    expect(
      await prisma.supplier.findUnique({ where: { id: supplier.id } }),
    ).toMatchObject({ isActive: false });

    const detail = await request(app)
      .get(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(detail.body.data.supplier.isActive).toBe(false);
  });

  it("reactivates the same archived Supplier without creating a duplicate", async () => {
    const supplier = await prisma.supplier.create({
      data: {
        companyId: companyAId,
        name: `${marker} Reactivate`,
        isActive: false,
      },
    });

    const response = await request(app)
      .patch(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ isActive: true })
      .expect(200);

    expect(response.body.data.supplier).toMatchObject({
      id: supplier.id,
      isActive: true,
    });
    expect(await prisma.supplier.count({ where: { id: supplier.id } })).toBe(1);
  });

  it.each(["post", "patch", "delete"] as const)(
    "forbids STAFF Supplier mutations through %s",
    async (method) => {
      const supplier = await prisma.supplier.create({
        data: { companyId: companyAId, name: `${marker} Staff ${method}` },
      });
      const path =
        method === "post"
          ? "/api/v1/suppliers"
          : `/api/v1/suppliers/${supplier.id}`;
      const body =
        method === "post"
          ? supplierInput(`${marker} Staff Create`)
          : method === "patch"
            ? { name: `${marker} Staff Edit` }
            : undefined;
      const response = await request(app)[method](path)
        .set("Authorization", bearer(staffToken))
        .send(body)
        .expect(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    },
  );

  it("forbids STAFF Supplier reactivation", async () => {
    const supplier = await prisma.supplier.create({
      data: {
        companyId: companyAId,
        name: `${marker} Staff Reactivate`,
        isActive: false,
      },
    });
    const response = await request(app)
      .patch(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(staffToken))
      .send({ isActive: true })
      .expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it.each([
    ["detail", "get"],
    ["update", "patch"],
    ["archive", "delete"],
  ] as const)("hides a Company B Supplier during %s", async (_label, method) => {
    const response = await request(app)[method](
      `/api/v1/suppliers/${companyBSupplierId}`,
    )
      .set("Authorization", bearer(ownerToken))
      .send(method === "patch" ? { name: "Cross-tenant change" } : undefined)
      .expect(404);
    expect(response.body.error).toEqual({
      code: "SUPPLIER_NOT_FOUND",
      message: "Supplier was not found",
    });
  });

  it("hides a Company B Supplier during reactivation", async () => {
    await prisma.supplier.update({
      where: { id: companyBSupplierId },
      data: { isActive: false },
    });
    const response = await request(app)
      .patch(`/api/v1/suppliers/${companyBSupplierId}`)
      .set("Authorization", bearer(ownerToken))
      .send({ isActive: true })
      .expect(404);
    expect(response.body.error.code).toBe("SUPPLIER_NOT_FOUND");
  });

  it("allows duplicate Supplier names, emails, and registration numbers", async () => {
    const duplicate = supplierInput(`${marker} Duplicate`, {
      registrationNumber: "DUPLICATE-SUP-REG",
      email: "duplicate-supplier@example.com",
    });
    const first = await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", bearer(ownerToken))
      .send(duplicate)
      .expect(201);
    const second = await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", bearer(ownerToken))
      .send(duplicate)
      .expect(201);

    expect(first.body.data.supplier.id).not.toBe(second.body.data.supplier.id);
  });

  it.each([
    ["missing name", { email: "valid@example.com" }],
    ["blank name", supplierInput("   ")],
    ["name too long", supplierInput("n".repeat(201))],
    [
      "registration number too long",
      supplierInput("Valid", { registrationNumber: "r".repeat(101) }),
    ],
    [
      "contact person too long",
      supplierInput("Valid", { contactPerson: "c".repeat(201) }),
    ],
    ["invalid email", supplierInput("Valid", { email: "not-an-email" })],
    [
      "email too long",
      supplierInput("Valid", { email: `${"a".repeat(310)}@example.com` }),
    ],
    ["phone too long", supplierInput("Valid", { phone: "1".repeat(51) })],
    ["address too long", supplierInput("Valid", { address: "a".repeat(2_001) })],
    ["notes too long", supplierInput("Valid", { notes: "n".repeat(2_001) })],
    ["unknown field", supplierInput("Valid", { unexpected: true })],
    ["companyId", supplierInput("Valid", { companyId: companyBId })],
    ["id", supplierInput("Valid", { id: randomUUID() })],
    ["createdAt", supplierInput("Valid", { createdAt: new Date().toISOString() })],
    ["updatedAt", supplierInput("Valid", { updatedAt: new Date().toISOString() })],
    ["isActive", supplierInput("Valid", { isActive: true })],
    ["control character", supplierInput("Invalid\nName")],
  ])("rejects invalid Supplier create input: %s", async (_label, body) => {
    const response = await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", bearer(ownerToken))
      .send(body)
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["null name", { name: null }],
    ["blank name", { name: "   " }],
    ["invalid email", { email: "invalid" }],
    ["companyId", { companyId: companyBId }],
    ["id", { id: randomUUID() }],
    ["createdAt", { createdAt: new Date().toISOString() }],
    ["updatedAt", { updatedAt: new Date().toISOString() }],
    ["arbitrary isActive false", { isActive: false }],
    ["unknown field", { balance: 100 }],
  ])("rejects invalid Supplier PATCH input: %s", async (_label, body) => {
    const supplier = await prisma.supplier.create({
      data: { companyId: companyAId, name: `${marker} Invalid Patch ${_label}` },
    });
    const response = await request(app)
      .patch(`/api/v1/suppliers/${supplier.id}`)
      .set("Authorization", bearer(ownerToken))
      .send(body)
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["companyId", "page", "isActive"])(
    "rejects unsupported Supplier list query parameter %s",
    async (parameter) => {
      const response = await request(app)
        .get("/api/v1/suppliers")
        .query({ [parameter]: companyBId })
        .set("Authorization", bearer(ownerToken))
        .expect(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("rejects a companyId injection without creating data in either Company", async () => {
    const injectedName = `${marker} Injected Tenant`;
    await request(app)
      .post("/api/v1/suppliers")
      .set("Authorization", bearer(ownerToken))
      .send(supplierInput(injectedName, { companyId: companyBId }))
      .expect(400);

    expect(await prisma.supplier.count({ where: { name: injectedName } })).toBe(0);
  });

  it("rejects malformed Supplier IDs", async () => {
    const response = await request(app)
      .get("/api/v1/suppliers/not-a-uuid")
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["list", "get", "/api/v1/suppliers", undefined],
    ["detail", "get", `/api/v1/suppliers/${randomUUID()}`, undefined],
    ["create", "post", "/api/v1/suppliers", supplierInput("Unauthenticated")],
    ["update", "patch", `/api/v1/suppliers/${randomUUID()}`, { name: "No" }],
    ["archive", "delete", `/api/v1/suppliers/${randomUUID()}`, undefined],
  ] as const)("requires authentication for Supplier %s", async (_label, method, path, body) => {
    const response = await request(app)[method](path).send(body).expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
