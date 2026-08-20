import "dotenv/config";

import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import {
  InventoryMovementType,
  Prisma,
  UserRole,
} from "../src/generated/prisma/client.js";
import { signAccessToken } from "../src/shared/security/jwt.js";
import { hashPassword } from "../src/shared/security/password.js";

const runId = randomUUID();
const marker = `Phase 3E Inventory ${runId}`;
const emailMarker = `phase3e-inventory-${runId}`;

let companyAId = "";
let companyBId = "";
let ownerId = "";
let adminId = "";
let staffId = "";
let companyBProductId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

process.env.JWT_SECRET = "phase-3e-inventory-test-secret-with-at-least-32-bytes";
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(token: string): string {
  return `Bearer ${token}`;
}

async function createProduct(
  label: string,
  options: { quantityOnHand?: string; isActive?: boolean } = {},
) {
  return prisma.product.create({
    data: {
      companyId: companyAId,
      sku: `${label}-${runId}`.toUpperCase(),
      name: `${label} Product`,
      unit: "PCS",
      costPrice: "1.00",
      sellingPrice: "2.00",
      quantityOnHand: options.quantityOnHand ?? "0",
      isActive: options.isActive ?? true,
    },
  });
}

function adjustmentPath(productId: string): string {
  return `/api/v1/products/${productId}/inventory-adjustments`;
}

function historyPath(productId: string): string {
  return `/api/v1/products/${productId}/inventory-movements`;
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 3E inventory test password");
  const companyA = await prisma.company.create({
    data: {
      name: `${marker} Company A`,
      users: {
        create: [
          {
            email: `${emailMarker}-owner@example.com`,
            passwordHash,
            firstName: "Olivia",
            lastName: "Owner",
            role: UserRole.OWNER,
          },
          {
            email: `${emailMarker}-admin@example.com`,
            passwordHash,
            firstName: "Aiden",
            lastName: "Admin",
            role: UserRole.ADMIN,
          },
          {
            email: `${emailMarker}-staff@example.com`,
            passwordHash,
            firstName: "Sam",
            lastName: "Staff",
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
      products: {
        create: {
          sku: `PRIVATE-${runId}`.toUpperCase(),
          name: "Company B Private Product",
          unit: "PCS",
          costPrice: "1.00",
          sellingPrice: "2.00",
          quantityOnHand: "2.000",
        },
      },
    },
    include: { products: true, users: true },
  });

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);
  if (!owner || !admin || !staff || !companyB.products[0] || !companyB.users[0]) {
    throw new Error("Inventory test setup failed");
  }

  await prisma.inventoryMovement.create({
    data: {
      companyId: companyB.id,
      productId: companyB.products[0].id,
      createdByUserId: companyB.users[0].id,
      type: InventoryMovementType.OPENING_BALANCE,
      quantity: "2.000",
      quantityBefore: "0",
      quantityAfter: "2.000",
      note: "Company B private movement",
    },
  });

  companyAId = companyA.id;
  companyBId = companyB.id;
  ownerId = owner.id;
  adminId = admin.id;
  staffId = staff.id;
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
  await prisma.inventoryMovement.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.product.deleteMany({
    where: { companyId: { in: [companyAId, companyBId] } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: emailMarker } } });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("Inventory authentication, authorization, and isolation", () => {
  it("rejects unauthenticated history and adjustment requests", async () => {
    const product = await createProduct("unauthenticated");

    for (const [method, path] of [
      ["get", historyPath(product.id)],
      ["post", adjustmentPath(product.id)],
    ] as const) {
      const response = await request(app)[method](path)
        .send({ type: "MANUAL_IN", quantity: "1" })
        .expect(401);
      expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("allows STAFF to view history but forbids adjustments", async () => {
    const product = await createProduct("staff-policy");
    await request(app)
      .get(historyPath(product.id))
      .set("Authorization", bearer(staffToken))
      .expect(200);
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(staffToken))
      .send({ type: "MANUAL_IN", quantity: "1" })
      .expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("0.000");
  });

  it.each([
    ["OWNER", () => ownerToken, () => ownerId],
    ["ADMIN", () => adminToken, () => adminId],
  ] as const)("allows %s to adjust stock and records the authenticated creator", async (_role, token, userId) => {
    const product = await createProduct(`allowed-${_role}`);
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(token()))
      .send({ type: "MANUAL_IN", quantity: "1" })
      .expect(201);

    expect(response.body.data.movement.createdBy.id).toBe(userId());
    const stored = await prisma.inventoryMovement.findUnique({
      where: { id: response.body.data.movement.id },
    });
    expect(stored).toMatchObject({
      companyId: companyAId,
      productId: product.id,
      createdByUserId: userId(),
    });
  });

  it("hides another Company's Product and movements from reads and writes", async () => {
    const historyResponse = await request(app)
      .get(historyPath(companyBProductId))
      .set("Authorization", bearer(ownerToken))
      .expect(404);
    const adjustmentResponse = await request(app)
      .post(adjustmentPath(companyBProductId))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "MANUAL_IN", quantity: "1" })
      .expect(404);

    expect(historyResponse.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(adjustmentResponse.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(
      (await prisma.product.findUnique({ where: { id: companyBProductId } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("2.000");
  });

  it.each(["companyId", "createdByUserId", "quantityBefore", "quantityAfter", "quantityOnHand", "productId"])(
    "rejects client-controlled %s without changing stock",
    async (field) => {
      const product = await createProduct(`forbidden-${field}`);
      const response = await request(app)
        .post(adjustmentPath(product.id))
        .set("Authorization", bearer(ownerToken))
        .send({ type: "MANUAL_IN", quantity: "1", [field]: companyBId })
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(
        (await prisma.product.findUnique({ where: { id: product.id } }))
          ?.quantityOnHand.toFixed(3),
      ).toBe("0.000");
    },
  );
});

describe("Opening balance", () => {
  it("creates the first exact opening balance and its immutable audit record", async () => {
    const product = await createProduct("opening-valid");
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({
        type: "OPENING_BALANCE",
        quantity: "25.125",
        note: "  Initial physical count  ",
      })
      .expect(201);

    expect(response.body).toEqual({
      status: "success",
      data: {
        product: { id: product.id, quantityOnHand: "25.125" },
        movement: {
          id: expect.any(String),
          type: "OPENING_BALANCE",
          quantity: "25.125",
          quantityBefore: "0.000",
          quantityAfter: "25.125",
          note: "Initial physical count",
          createdAt: expect.any(String),
          createdBy: {
            id: ownerId,
            firstName: "Olivia",
            lastName: "Owner",
          },
        },
      },
    });
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("25.125");
  });

  it.each([
    ["zero", "0"],
    ["negative", "-1"],
  ])("rejects a %s opening quantity", async (_label, quantity) => {
    const product = await createProduct(`opening-${_label}`);
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "OPENING_BALANCE", quantity })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a second opening balance without changing either table", async () => {
    const product = await createProduct("opening-second");
    await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "OPENING_BALANCE", quantity: "2" })
      .expect(201);
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "OPENING_BALANCE", quantity: "3" })
      .expect(409);

    expect(response.body.error.code).toBe("OPENING_BALANCE_NOT_ALLOWED");
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("2.000");
    expect(
      await prisma.inventoryMovement.count({ where: { productId: product.id } }),
    ).toBe(1);
  });

  it("rejects opening balance after a manual movement even when stock returned to zero", async () => {
    const product = await createProduct("opening-after-manual");
    for (const body of [
      { type: "MANUAL_IN", quantity: "2" },
      { type: "MANUAL_OUT", quantity: "2" },
    ]) {
      await request(app)
        .post(adjustmentPath(product.id))
        .set("Authorization", bearer(ownerToken))
        .send(body)
        .expect(201);
    }

    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "OPENING_BALANCE", quantity: "1" })
      .expect(409);
    expect(response.body.error.code).toBe("OPENING_BALANCE_NOT_ALLOWED");
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("0.000");
  });

  it("rejects opening balance when Product stock is already nonzero", async () => {
    const product = await createProduct("opening-nonzero", {
      quantityOnHand: "4.000",
    });
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "OPENING_BALANCE", quantity: "1" })
      .expect(409);
    expect(response.body.error.code).toBe("OPENING_BALANCE_NOT_ALLOWED");
  });

  it("rejects opening balance for an archived Product", async () => {
    const product = await createProduct("opening-archived", { isActive: false });
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "OPENING_BALANCE", quantity: "1" })
      .expect(409);
    expect(response.body.error.code).toBe("PRODUCT_INACTIVE");
  });
});

describe("Manual stock in and stock out", () => {
  it.each([
    ["integer", "5", "5.000"],
    ["three-decimal", "5.250", "5.250"],
  ])("adds an exact %s quantity", async (_label, quantity, expected) => {
    const product = await createProduct(`manual-in-${_label}`, {
      quantityOnHand: "10.000",
    });
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(adminToken))
      .send({ type: "MANUAL_IN", quantity, note: "   " })
      .expect(201);

    expect(response.body.data.product.quantityOnHand).toBe(
      _label === "integer" ? "15.000" : "15.250",
    );
    expect(response.body.data.movement).toMatchObject({
      type: "MANUAL_IN",
      quantity: expected,
      quantityBefore: "10.000",
      quantityAfter: _label === "integer" ? "15.000" : "15.250",
      note: null,
      createdBy: { id: adminId },
    });
  });

  it("subtracts exact stock and records the real committed transition", async () => {
    const product = await createProduct("manual-out-valid", {
      quantityOnHand: "10.000",
    });
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "MANUAL_OUT", quantity: "4.250", note: null })
      .expect(201);

    expect(response.body.data.product.quantityOnHand).toBe("5.750");
    expect(response.body.data.movement).toMatchObject({
      type: "MANUAL_OUT",
      quantity: "4.250",
      quantityBefore: "10.000",
      quantityAfter: "5.750",
      note: null,
    });
  });

  it("allows stock out equal to the current stock and reaches exactly zero", async () => {
    const product = await createProduct("manual-out-zero", {
      quantityOnHand: "3.125",
    });
    await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "MANUAL_OUT", quantity: "3.125" })
      .expect(201);
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("0.000");
  });

  it("rejects excessive stock out without a balance or movement change", async () => {
    const product = await createProduct("manual-out-excess", {
      quantityOnHand: "10.000",
    });
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "MANUAL_OUT", quantity: "10.001" })
      .expect(409);

    expect(response.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("10.000");
    expect(
      await prisma.inventoryMovement.count({ where: { productId: product.id } }),
    ).toBe(0);
  });

  it.each(["MANUAL_IN", "MANUAL_OUT"])(
    "rejects %s for an archived Product",
    async (type) => {
      const product = await createProduct(`archived-${type}`, {
        quantityOnHand: "5",
        isActive: false,
      });
      const response = await request(app)
        .post(adjustmentPath(product.id))
        .set("Authorization", bearer(ownerToken))
        .send({ type, quantity: "1" })
        .expect(409);
      expect(response.body.error.code).toBe("PRODUCT_INACTIVE");
    },
  );
});

describe("Inventory validation and history", () => {
  it.each([
    ["zero", { type: "MANUAL_IN", quantity: "0" }],
    ["negative", { type: "MANUAL_IN", quantity: "-1" }],
    ["blank", { type: "MANUAL_IN", quantity: " " }],
    ["nonnumeric", { type: "MANUAL_IN", quantity: "five" }],
    ["excess scale", { type: "MANUAL_IN", quantity: "1.0001" }],
    ["excess precision", { type: "MANUAL_IN", quantity: "100000000000.000" }],
    ["numeric JSON", { type: "MANUAL_IN", quantity: 1 }],
    ["unsupported type", { type: "PURCHASE_RECEIPT", quantity: "1" }],
    ["unknown field", { type: "MANUAL_IN", quantity: "1", unexpected: true }],
  ])("rejects %s adjustment input", async (_label, body) => {
    const product = await createProduct(`validation-${_label}`);
    const response = await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send(body)
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns an empty history for a Product without movements", async () => {
    const product = await createProduct("history-empty");
    const response = await request(app)
      .get(historyPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .expect(200);
    expect(response.body).toEqual({
      status: "success",
      data: { movements: [] },
    });
  });

  it("returns safe creator fields in deterministic newest-first order", async () => {
    const product = await createProduct("history-order", {
      quantityOnHand: "6.000",
    });
    const older = new Date("2026-08-20T01:00:00.000Z");
    const newer = new Date("2026-08-20T02:00:00.000Z");
    const ids = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
    ];
    await prisma.inventoryMovement.createMany({
      data: [
        {
          id: ids[0], companyId: companyAId, productId: product.id,
          createdByUserId: ownerId, type: InventoryMovementType.MANUAL_IN,
          quantity: "1", quantityBefore: "0", quantityAfter: "1", createdAt: older,
        },
        {
          id: ids[1], companyId: companyAId, productId: product.id,
          createdByUserId: adminId, type: InventoryMovementType.MANUAL_IN,
          quantity: "2", quantityBefore: "1", quantityAfter: "3", note: "Second", createdAt: newer,
        },
        {
          id: ids[2], companyId: companyAId, productId: product.id,
          createdByUserId: ownerId, type: InventoryMovementType.MANUAL_IN,
          quantity: "3", quantityBefore: "3", quantityAfter: "6", note: "Latest tie", createdAt: newer,
        },
      ],
    });

    const response = await request(app)
      .get(historyPath(product.id))
      .set("Authorization", bearer(staffToken))
      .expect(200);
    expect(response.body.data.movements.map((movement: { id: string }) => movement.id)).toEqual([
      ids[2], ids[1], ids[0],
    ]);
    expect(response.body.data.movements[0]).toEqual({
      id: ids[2],
      type: "MANUAL_IN",
      quantity: "3.000",
      quantityBefore: "3.000",
      quantityAfter: "6.000",
      note: "Latest tie",
      createdAt: newer.toISOString(),
      createdBy: { id: ownerId, firstName: "Olivia", lastName: "Owner" },
    });
    expect(response.body.data.movements[0]).not.toHaveProperty("companyId");
    expect(response.body.data.movements[0]).not.toHaveProperty("createdByUserId");
    expect(response.body.data.movements[0].createdBy).not.toHaveProperty("email");
    expect(response.body.data.movements[0].createdBy).not.toHaveProperty("passwordHash");
  });

  it("keeps archived Product history readable", async () => {
    const product = await createProduct("history-archived");
    await request(app)
      .post(adjustmentPath(product.id))
      .set("Authorization", bearer(ownerToken))
      .send({ type: "MANUAL_IN", quantity: "1" })
      .expect(201);
    await prisma.product.update({
      where: { id: product.id },
      data: { isActive: false },
    });
    const response = await request(app)
      .get(historyPath(product.id))
      .set("Authorization", bearer(staffToken))
      .expect(200);
    expect(response.body.data.movements).toHaveLength(1);
  });
});

describe("Inventory transaction and concurrency integrity", () => {
  it("allows only one of two concurrent stock-outs to spend the same stock", async () => {
    const product = await createProduct("concurrent-out", {
      quantityOnHand: "5.000",
    });

    const responses = await Promise.all([
      request(app)
        .post(adjustmentPath(product.id))
        .set("Authorization", bearer(ownerToken))
        .send({ type: "MANUAL_OUT", quantity: "4.000" }),
      request(app)
        .post(adjustmentPath(product.id))
        .set("Authorization", bearer(adminToken))
        .send({ type: "MANUAL_OUT", quantity: "4.000" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(
      responses.find((response) => response.status === 409)?.body.error.code,
    ).toBe("INSUFFICIENT_STOCK");
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("1.000");
    const movements = await prisma.inventoryMovement.findMany({
      where: { productId: product.id },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ type: InventoryMovementType.MANUAL_OUT });
    expect(movements[0]?.quantityBefore.toFixed(3)).toBe("5.000");
    expect(movements[0]?.quantityAfter.toFixed(3)).toBe("1.000");
  });

  it("rolls back the Product update when movement creation fails", async () => {
    const product = await createProduct("rollback", {
      quantityOnHand: "5.000",
    });
    const originalTransaction = prisma.$transaction.bind(prisma);
    const failingTransaction = (async (
      callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
    ) =>
      originalTransaction(async (transaction) => {
        const failingClient = new Proxy(transaction, {
          get(target, property, receiver) {
            if (property !== "inventoryMovement") {
              return Reflect.get(target, property, receiver);
            }

            return new Proxy(target.inventoryMovement, {
              get(delegate, method, delegateReceiver) {
                if (method === "create") {
                  return async () => {
                    throw new Error("Test-only movement insert failure");
                  };
                }

                const value = Reflect.get(delegate, method, delegateReceiver);
                return typeof value === "function" ? value.bind(delegate) : value;
              },
            });
          },
        }) as Prisma.TransactionClient;

        return callback(failingClient);
      })) as typeof prisma.$transaction;
    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementationOnce(failingTransaction);

    try {
      const response = await request(app)
        .post(adjustmentPath(product.id))
        .set("Authorization", bearer(ownerToken))
        .send({ type: "MANUAL_IN", quantity: "2.000" })
        .expect(500);
      expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    } finally {
      transactionSpy.mockRestore();
    }

    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))
        ?.quantityOnHand.toFixed(3),
    ).toBe("5.000");
    expect(
      await prisma.inventoryMovement.count({ where: { productId: product.id } }),
    ).toBe(0);
  });
});
