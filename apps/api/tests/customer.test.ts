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
const marker = `Phase 4C Customer ${runId}`;
const emailMarker = `phase4c-customer-${runId}`;

let companyAId = "";
let companyBId = "";
let companyBCustomerId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

process.env.JWT_SECRET = "phase-4c-customer-test-secret-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function customerInput(
  name: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    name,
    registrationNumber: "REG-100",
    contactPerson: "Customer Contact",
    email: "customer@example.com",
    phone: "+60 12-345 6789",
    billingAddress: "Customer billing address",
    shippingAddress: "Customer shipping address",
    notes: "Customer notes",
    ...overrides,
  };
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 4C customer test password");
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
      customers: {
        create: {
          name: "Company B Private Customer",
          email: "private-customer@example.com",
        },
      },
    },
    include: { customers: true },
  });

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  if (!owner || !admin || !staff || !companyB.customers[0]) {
    throw new Error("Customer test setup failed");
  }

  companyAId = companyA.id;
  companyBId = companyB.id;
  companyBCustomerId = companyB.customers[0].id;
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
  await prisma.customer.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: emailMarker } } });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("Customer API", () => {
  it("allows an OWNER to create a normalized Customer with only safe response fields", async () => {
    const response = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", bearer(ownerToken))
      .send(
        customerInput("  Northstar Retail  ", {
          registrationNumber: "  MY-100  ",
          contactPerson: "  Amina Rahman  ",
          email: "  SALES@NORTHSTAR.EXAMPLE  ",
          phone: "  +60 12-345 6789  ",
          billingAddress: "  Level 1\nKuala Lumpur  ",
          shippingAddress: "   ",
          notes: null,
        }),
      )
      .expect(201);

    expect(response.body).toEqual({
      status: "success",
      data: {
        customer: {
          id: expect.any(String),
          name: "Northstar Retail",
          registrationNumber: "MY-100",
          contactPerson: "Amina Rahman",
          email: "sales@northstar.example",
          phone: "+60 12-345 6789",
          billingAddress: "Level 1\nKuala Lumpur",
          shippingAddress: null,
          notes: null,
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
    expect(response.body.data.customer).not.toHaveProperty("companyId");
    expect(response.body.data.customer).not.toHaveProperty("company");

    const stored = await prisma.customer.findUnique({
      where: { id: response.body.data.customer.id },
    });
    expect(stored).toMatchObject({
      companyId: companyAId,
      email: "sales@northstar.example",
      shippingAddress: null,
      isActive: true,
    });
  });

  it("stores omitted optional Customer fields as null", async () => {
    const response = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", bearer(ownerToken))
      .send({ name: `${marker} Minimal` })
      .expect(201);

    expect(response.body.data.customer).toMatchObject({
      registrationNumber: null,
      contactPerson: null,
      email: null,
      phone: null,
      billingAddress: null,
      shippingAddress: null,
      notes: null,
    });
  });

  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows %s to list and retrieve only Company A Customers", async (role, token) => {
    const customer = await prisma.customer.create({
      data: { companyId: companyAId, name: `${marker} Read ${role}` },
    });

    const listResponse = await request(app)
      .get("/api/v1/customers")
      .set("Authorization", bearer(token()))
      .expect(200);
    const listedIds = listResponse.body.data.customers.map(
      (listedCustomer: { id: string }) => listedCustomer.id,
    );
    expect(listedIds).toContain(customer.id);
    expect(listedIds).not.toContain(companyBCustomerId);

    const detailResponse = await request(app)
      .get(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(token()))
      .expect(200);
    expect(detailResponse.body.data.customer.id).toBe(customer.id);
    expect(detailResponse.body.data.customer).not.toHaveProperty("companyId");
  });

  it("applies partial PATCH semantics, null clearing, blank-to-null, and email lowercasing", async () => {
    const customer = await prisma.customer.create({
      data: {
        companyId: companyAId,
        name: `${marker} Patch`,
        registrationNumber: "KEEP-REG",
        contactPerson: "Clear Me",
        email: "old@example.com",
        phone: "0123456789",
        billingAddress: "Old billing",
        shippingAddress: "Old shipping",
        notes: "Old notes",
      },
    });

    const response = await request(app)
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({
        name: "  Updated Customer  ",
        contactPerson: null,
        email: "  NEW@EXAMPLE.COM  ",
        phone: "   ",
        billingAddress: null,
        shippingAddress: "  New shipping  ",
        notes: "   ",
      })
      .expect(200);

    expect(response.body.data.customer).toMatchObject({
      name: "Updated Customer",
      registrationNumber: "KEEP-REG",
      contactPerson: null,
      email: "new@example.com",
      phone: null,
      billingAddress: null,
      shippingAddress: "New shipping",
      notes: null,
      isActive: true,
    });
  });

  it("allows an ADMIN to create, update, archive, and reactivate a Customer", async () => {
    const created = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", bearer(adminToken))
      .send(customerInput(`${marker} Admin CRUD`))
      .expect(201);
    const customerId = created.body.data.customer.id as string;

    await request(app)
      .patch(`/api/v1/customers/${customerId}`)
      .set("Authorization", bearer(adminToken))
      .send({ notes: "Admin updated" })
      .expect(200);
    await request(app)
      .delete(`/api/v1/customers/${customerId}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    const reactivated = await request(app)
      .patch(`/api/v1/customers/${customerId}`)
      .set("Authorization", bearer(adminToken))
      .send({ isActive: true })
      .expect(200);
    expect(reactivated.body.data.customer.isActive).toBe(true);
  });

  it("archives idempotently without physically deleting and keeps archived detail readable", async () => {
    const customer = await prisma.customer.create({
      data: { companyId: companyAId, name: `${marker} Archive` },
    });

    const firstArchive = await request(app)
      .delete(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    const secondArchive = await request(app)
      .delete(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);

    expect(firstArchive.body.data.customer.id).toBe(customer.id);
    expect(secondArchive.body.data.customer).toMatchObject({
      id: customer.id,
      isActive: false,
    });
    expect(await prisma.customer.count({ where: { id: customer.id } })).toBe(1);
    expect(
      await prisma.customer.findUnique({ where: { id: customer.id } }),
    ).toMatchObject({ isActive: false });

    const detail = await request(app)
      .get(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(detail.body.data.customer.isActive).toBe(false);
  });

  it("reactivates the same archived Customer without creating a duplicate", async () => {
    const customer = await prisma.customer.create({
      data: {
        companyId: companyAId,
        name: `${marker} Reactivate`,
        isActive: false,
      },
    });

    const response = await request(app)
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(ownerToken))
      .send({ isActive: true })
      .expect(200);

    expect(response.body.data.customer).toMatchObject({
      id: customer.id,
      isActive: true,
    });
    expect(await prisma.customer.count({ where: { id: customer.id } })).toBe(1);
  });

  it.each(["post", "patch", "delete"] as const)(
    "forbids STAFF Customer mutations through %s",
    async (method) => {
      const customer = await prisma.customer.create({
        data: { companyId: companyAId, name: `${marker} Staff ${method}` },
      });
      const path =
        method === "post"
          ? "/api/v1/customers"
          : `/api/v1/customers/${customer.id}`;
      const body =
        method === "post"
          ? customerInput(`${marker} Staff Create`)
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

  it("forbids STAFF Customer reactivation", async () => {
    const customer = await prisma.customer.create({
      data: {
        companyId: companyAId,
        name: `${marker} Staff Reactivate`,
        isActive: false,
      },
    });
    const response = await request(app)
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(staffToken))
      .send({ isActive: true })
      .expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it.each([
    ["detail", "get"],
    ["update", "patch"],
    ["archive", "delete"],
  ] as const)("hides a Company B Customer during %s", async (_label, method) => {
    const response = await request(app)[method](
      `/api/v1/customers/${companyBCustomerId}`,
    )
      .set("Authorization", bearer(ownerToken))
      .send(method === "patch" ? { name: "Cross-tenant change" } : undefined)
      .expect(404);
    expect(response.body.error).toEqual({
      code: "CUSTOMER_NOT_FOUND",
      message: "Customer was not found",
    });
  });

  it("hides a Company B Customer during reactivation", async () => {
    await prisma.customer.update({
      where: { id: companyBCustomerId },
      data: { isActive: false },
    });
    const response = await request(app)
      .patch(`/api/v1/customers/${companyBCustomerId}`)
      .set("Authorization", bearer(ownerToken))
      .send({ isActive: true })
      .expect(404);
    expect(response.body.error.code).toBe("CUSTOMER_NOT_FOUND");
  });

  it("allows duplicate Customer names, emails, and registration numbers", async () => {
    const duplicate = customerInput(`${marker} Duplicate`, {
      registrationNumber: "DUPLICATE-REG",
      email: "duplicate-customer@example.com",
    });
    const first = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", bearer(ownerToken))
      .send(duplicate)
      .expect(201);
    const second = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", bearer(ownerToken))
      .send(duplicate)
      .expect(201);

    expect(first.body.data.customer.id).not.toBe(second.body.data.customer.id);
  });

  it.each([
    ["missing name", { email: "valid@example.com" }],
    ["blank name", customerInput("   ")],
    ["name too long", customerInput("n".repeat(201))],
    [
      "registration number too long",
      customerInput("Valid", { registrationNumber: "r".repeat(101) }),
    ],
    [
      "contact person too long",
      customerInput("Valid", { contactPerson: "c".repeat(201) }),
    ],
    ["invalid email", customerInput("Valid", { email: "not-an-email" })],
    [
      "email too long",
      customerInput("Valid", { email: `${"a".repeat(310)}@example.com` }),
    ],
    ["phone too long", customerInput("Valid", { phone: "1".repeat(51) })],
    [
      "billing address too long",
      customerInput("Valid", { billingAddress: "a".repeat(2_001) }),
    ],
    [
      "shipping address too long",
      customerInput("Valid", { shippingAddress: "a".repeat(2_001) }),
    ],
    ["notes too long", customerInput("Valid", { notes: "n".repeat(2_001) })],
    ["unknown field", customerInput("Valid", { unexpected: true })],
    ["companyId", customerInput("Valid", { companyId: companyBId })],
    ["id", customerInput("Valid", { id: randomUUID() })],
    ["createdAt", customerInput("Valid", { createdAt: new Date().toISOString() })],
    ["updatedAt", customerInput("Valid", { updatedAt: new Date().toISOString() })],
    ["isActive", customerInput("Valid", { isActive: true })],
    ["control character", customerInput("Invalid\nName")],
  ])("rejects invalid Customer create input: %s", async (_label, body) => {
    const response = await request(app)
      .post("/api/v1/customers")
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
  ])("rejects invalid Customer PATCH input: %s", async (_label, body) => {
    const customer = await prisma.customer.create({
      data: { companyId: companyAId, name: `${marker} Invalid Patch ${_label}` },
    });
    const response = await request(app)
      .patch(`/api/v1/customers/${customer.id}`)
      .set("Authorization", bearer(ownerToken))
      .send(body)
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["companyId", "search", "isActive"])(
    "rejects unsupported Customer list query parameter %s",
    async (parameter) => {
      const response = await request(app)
        .get("/api/v1/customers")
        .query({ [parameter]: companyBId })
        .set("Authorization", bearer(ownerToken))
        .expect(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("rejects a companyId injection without creating data in either Company", async () => {
    const injectedName = `${marker} Injected Tenant`;
    await request(app)
      .post("/api/v1/customers")
      .set("Authorization", bearer(ownerToken))
      .send(customerInput(injectedName, { companyId: companyBId }))
      .expect(400);

    expect(await prisma.customer.count({ where: { name: injectedName } })).toBe(0);
  });

  it("rejects malformed Customer IDs", async () => {
    const response = await request(app)
      .get("/api/v1/customers/not-a-uuid")
      .set("Authorization", bearer(ownerToken))
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["list", "get", "/api/v1/customers", undefined],
    ["detail", "get", `/api/v1/customers/${randomUUID()}`, undefined],
    ["create", "post", "/api/v1/customers", customerInput("Unauthenticated")],
    ["update", "patch", `/api/v1/customers/${randomUUID()}`, { name: "No" }],
    ["archive", "delete", `/api/v1/customers/${randomUUID()}`, undefined],
  ] as const)("requires authentication for Customer %s", async (_label, method, path, body) => {
    const response = await request(app)[method](path).send(body).expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
