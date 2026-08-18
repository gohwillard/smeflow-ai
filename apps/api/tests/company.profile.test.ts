import "dotenv/config";

import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { UserRole } from "../src/generated/prisma/client.js";
import { signAccessToken } from "../src/shared/security/jwt.js";
import { hashPassword } from "../src/shared/security/password.js";

const runId = randomUUID();
const companyNameMarker = `Phase 2F Test ${runId}`;
const emailMarker = `phase2f-${runId}`;
const testJwtSecret = "phase-2f-test-secret-with-at-least-32-bytes";

const initialCompanyAProfile = {
  name: `${companyNameMarker} Company A`,
  registrationNumber: "REG-A-001",
  email: `${emailMarker}-company-a@example.com`,
  phone: "+60 3 1111 1111",
  address: "1 Company A Road",
};

const initialCompanyBProfile = {
  name: `${companyNameMarker} Company B`,
  registrationNumber: "REG-B-001",
  email: `${emailMarker}-company-b@example.com`,
  phone: "+60 3 2222 2222",
  address: "2 Company B Road",
};

let companyAId = "";
let companyBId = "";
let ownerUserId = "";
let adminUserId = "";
let staffUserId = "";
let ownerToken = "";
let adminToken = "";
let staffToken = "";

process.env.JWT_SECRET = testJwtSecret;
process.env.JWT_ISSUER = "smeflow-api";
process.env.JWT_AUDIENCE = "smeflow-web";
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

function bearer(accessToken: string): string {
  return `Bearer ${accessToken}`;
}

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 2F fictional test password");

  const companyA = await prisma.company.create({
    data: {
      ...initialCompanyAProfile,
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
      ...initialCompanyBProfile,
      users: {
        create: {
          email: `${emailMarker}-company-b-owner@example.com`,
          passwordHash,
          firstName: "Other",
          lastName: "Owner",
          role: UserRole.OWNER,
        },
      },
    },
  });

  const owner = companyA.users.find((user) => user.role === UserRole.OWNER);
  const admin = companyA.users.find((user) => user.role === UserRole.ADMIN);
  const staff = companyA.users.find((user) => user.role === UserRole.STAFF);

  if (!owner || !admin || !staff) {
    throw new Error("Company profile test users were not created");
  }

  companyAId = companyA.id;
  companyBId = companyB.id;
  ownerUserId = owner.id;
  adminUserId = admin.id;
  staffUserId = staff.id;

  ({ accessToken: ownerToken } = await signAccessToken({
    userId: ownerUserId,
    companyId: companyAId,
    role: UserRole.OWNER,
  }));
  ({ accessToken: adminToken } = await signAccessToken({
    userId: adminUserId,
    companyId: companyAId,
    role: UserRole.ADMIN,
  }));
  ({ accessToken: staffToken } = await signAccessToken({
    userId: staffUserId,
    companyId: companyAId,
    role: UserRole.STAFF,
  }));
});

beforeEach(async () => {
  await prisma.company.update({
    where: { id: companyAId },
    data: initialCompanyAProfile,
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: emailMarker } },
  });
  await prisma.company.deleteMany({
    where: { id: { in: [companyAId, companyBId] } },
  });
  await prisma.$disconnect();
});

describe("GET /api/v1/company/profile", () => {
  it.each([
    ["OWNER", () => ownerToken],
    ["ADMIN", () => adminToken],
    ["STAFF", () => staffToken],
  ])("allows an authenticated %s to retrieve their own company", async (_role, token) => {
    const response = await request(app)
      .get("/api/v1/company/profile")
      .set("Authorization", bearer(token()))
      .expect(200);

    expect(response.body).toEqual({
      status: "success",
      data: {
        company: {
          id: companyAId,
          ...initialCompanyAProfile,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
    expect(Object.keys(response.body.data.company).sort()).toEqual(
      [
        "id",
        "name",
        "registrationNumber",
        "email",
        "phone",
        "address",
        "createdAt",
        "updatedAt",
      ].sort(),
    );
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("requires authentication", async () => {
    const response = await request(app)
      .get("/api/v1/company/profile")
      .expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("cannot retrieve Company B when a Company A user supplies Company B in the query", async () => {
    const response = await request(app)
      .get("/api/v1/company/profile")
      .query({ companyId: companyBId })
      .set("Authorization", bearer(ownerToken))
      .expect(200);

    expect(response.body.data.company.id).toBe(companyAId);
    expect(response.body.data.company.id).not.toBe(companyBId);
    expect(response.body.data.company.name).toBe(initialCompanyAProfile.name);
  });
});

describe("PATCH /api/v1/company/profile", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .send({ phone: "+60 3 0000 0000" })
      .expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("allows an OWNER to update the company and normalizes its contact email", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({
        phone: "+60 3 3333 3333",
        email: "  CONTACT@EXAMPLE.COM  ",
      })
      .expect(200);

    expect(response.body.data.company).toMatchObject({
      id: companyAId,
      phone: "+60 3 3333 3333",
      email: "contact@example.com",
    });
  });

  it("allows an ADMIN to update the company", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(adminToken))
      .send({ address: "99 Updated Address" })
      .expect(200);

    expect(response.body.data.company).toMatchObject({
      id: companyAId,
      address: "99 Updated Address",
    });
  });

  it("keeps STAFF read-only", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(staffToken))
      .send({ phone: "+60 3 4444 4444" })
      .expect(403);

    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "FORBIDDEN",
        message: "You are not allowed to perform this action",
      },
    });
    expect((await prisma.company.findUnique({ where: { id: companyAId } }))?.phone).toBe(
      initialCompanyAProfile.phone,
    );
  });

  it("updates only supplied fields and leaves omitted fields unchanged", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ phone: "+60 3 5555 5555" })
      .expect(200);

    expect(response.body.data.company).toMatchObject({
      ...initialCompanyAProfile,
      id: companyAId,
      phone: "+60 3 5555 5555",
    });
  });

  it("trims a supplied company name", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ name: "  Trimmed Company Name  " })
      .expect(200);

    expect(response.body.data.company.name).toBe("Trimmed Company Name");
  });

  it("rejects a blank company name", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ name: "   " })
      .expect(400);

    expect(response.body.error.details).toContainEqual({
      field: "name",
      message: "Company name must not be blank",
    });
  });

  it("rejects null for the required company name", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ name: null })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("clears optional profile fields when they are explicitly null", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({
        registrationNumber: null,
        email: null,
        phone: null,
        address: null,
      })
      .expect(200);

    expect(response.body.data.company).toMatchObject({
      registrationNumber: null,
      email: null,
      phone: null,
      address: null,
    });
  });

  it("rejects an invalid company contact email", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ email: "not-an-email" })
      .expect(400);

    expect(response.body.error.details).toContainEqual({
      field: "email",
      message: "Company email must be a valid email address",
    });
  });

  it.each(["registrationNumber", "email", "phone", "address"])(
    "rejects a blank optional %s instead of storing it",
    async (field) => {
      const response = await request(app)
        .patch("/api/v1/company/profile")
        .set("Authorization", bearer(ownerToken))
        .send({ [field]: "   " })
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("rejects unknown PATCH fields", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ unexpectedSetting: true })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a request-supplied companyId and does not change either company", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ companyId: companyBId, phone: "+60 3 6666 6666" })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    const [companyA, companyB] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyAId } }),
      prisma.company.findUnique({ where: { id: companyBId } }),
    ]);

    expect(companyA?.phone).toBe(initialCompanyAProfile.phone);
    expect(companyB?.phone).toBe(initialCompanyBProfile.phone);
  });

  it("cannot update Company B when a Company A user supplies Company B in the query", async () => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .query({ companyId: companyBId })
      .set("Authorization", bearer(adminToken))
      .send({ phone: "+60 3 7777 7777" })
      .expect(200);

    expect(response.body.data.company.id).toBe(companyAId);
    expect(response.body.data.company.phone).toBe("+60 3 7777 7777");
    expect((await prisma.company.findUnique({ where: { id: companyBId } }))?.phone).toBe(
      initialCompanyBProfile.phone,
    );
  });

  it.each([
    ["id", randomUUID()],
    ["createdAt", new Date(0).toISOString()],
    ["updatedAt", new Date(0).toISOString()],
  ])("rejects attempts to modify %s", async (field, value) => {
    const response = await request(app)
      .patch("/api/v1/company/profile")
      .set("Authorization", bearer(ownerToken))
      .send({ [field]: value })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
