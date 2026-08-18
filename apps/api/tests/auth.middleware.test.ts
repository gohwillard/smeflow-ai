import "dotenv/config";

import { randomUUID } from "node:crypto";

import { SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { UserRole } from "../src/generated/prisma/client.js";
import { signAccessToken } from "../src/shared/security/jwt.js";
import { hashPassword } from "../src/shared/security/password.js";

const runId = randomUUID();
const companyNameMarker = `Phase 2E Test ${runId}`;
const emailMarker = `phase2e-${runId}`;
const testJwtSecret = "phase-2e-test-secret-with-at-least-32-bytes";
const alternateJwtSecret =
  "phase-2e-alternate-test-secret-with-at-least-32-bytes";
const jwtIssuer = "smeflow-api";
const jwtAudience = "smeflow-web";

let companyAId: string;
let companyBId: string;
let activeUserId: string;
let inactiveUserId: string;
let deletedUserId: string;

process.env.JWT_SECRET = testJwtSecret;
process.env.JWT_ISSUER = jwtIssuer;
process.env.JWT_AUDIENCE = jwtAudience;
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

interface TestTokenOptions {
  subject?: string;
  companyId?: unknown;
  role?: unknown;
  issuer?: string;
  audience?: string;
  issuedAt?: number;
  expirationTime?: number;
  algorithm?: "HS256" | "HS384";
  secret?: string;
  includeCompanyId?: boolean;
  includeRole?: boolean;
}

async function createTestToken(
  options: TestTokenOptions = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {};

  if (options.includeCompanyId !== false) {
    payload.companyId = options.companyId ?? companyAId;
  }

  if (options.includeRole !== false) {
    payload.role = options.role ?? UserRole.ADMIN;
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: options.algorithm ?? "HS256", typ: "JWT" })
    .setSubject(options.subject ?? activeUserId)
    .setIssuedAt(options.issuedAt ?? now)
    .setExpirationTime(options.expirationTime ?? now + 30 * 60)
    .setIssuer(options.issuer ?? jwtIssuer)
    .setAudience(options.audience ?? jwtAudience)
    .sign(new TextEncoder().encode(options.secret ?? testJwtSecret));
}

const invalidTokenResponse = {
  status: "error",
  error: {
    code: "INVALID_TOKEN",
    message: "Access token is invalid",
  },
};

beforeAll(async () => {
  const passwordHash = await hashPassword("Phase 2E fictional test password");

  const companyA = await prisma.company.create({
    data: {
      name: `${companyNameMarker} Company A`,
      users: {
        create: [
          {
            email: `${emailMarker}-active@example.com`,
            passwordHash,
            firstName: "Katherine",
            lastName: "Johnson",
            role: UserRole.ADMIN,
          },
          {
            email: `${emailMarker}-inactive@example.com`,
            passwordHash,
            firstName: "Inactive",
            lastName: "Analyst",
            role: UserRole.STAFF,
            isActive: false,
          },
          {
            email: `${emailMarker}-deleted@example.com`,
            passwordHash,
            firstName: "Deleted",
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
      name: `${companyNameMarker} Company B`,
      users: {
        create: {
          email: `${emailMarker}-company-b@example.com`,
          passwordHash,
          firstName: "Dorothy",
          lastName: "Vaughan",
          role: UserRole.OWNER,
        },
      },
    },
  });

  const activeUser = companyA.users.find((user) =>
    user.email.endsWith("-active@example.com"),
  );
  const inactiveUser = companyA.users.find((user) =>
    user.email.endsWith("-inactive@example.com"),
  );
  const deletedUser = companyA.users.find((user) =>
    user.email.endsWith("-deleted@example.com"),
  );

  if (!activeUser || !inactiveUser || !deletedUser) {
    throw new Error("Authentication middleware test users were not created");
  }

  companyAId = companyA.id;
  companyBId = companyB.id;
  activeUserId = activeUser.id;
  inactiveUserId = inactiveUser.id;
  deletedUserId = deletedUser.id;

  await prisma.user.delete({ where: { id: deletedUserId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: emailMarker } },
  });
  await prisma.company.deleteMany({
    where: { name: { startsWith: companyNameMarker } },
  });
  await prisma.$disconnect();
});

describe("GET /api/v1/auth/me", () => {
  it("accepts a valid Bearer token and returns only safe current-user fields", async () => {
    const { accessToken } = await signAccessToken({
      userId: activeUserId,
      companyId: companyAId,
      role: UserRole.ADMIN,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      status: "success",
      data: {
        user: {
          id: activeUserId,
          companyId: companyAId,
          email: `${emailMarker}-active@example.com`,
          firstName: "Katherine",
          lastName: "Johnson",
          role: "ADMIN",
          isActive: true,
        },
      },
    });
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("requires an Authorization header", async () => {
    const response = await request(app).get("/api/v1/auth/me").expect(401);

    expect(response.headers["www-authenticate"]).toBe("Bearer");
    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required",
      },
    });
  });

  it("does not accept an access token from query parameters or the body", async () => {
    const token = await createTestToken();
    const response = await request(app)
      .get(`/api/v1/auth/me?accessToken=${token}`)
      .send({ accessToken: token })
      .expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it.each([
    "Basic credentials",
    "Bearer",
    "Bearer  token",
    "Bearer token extra",
  ])("rejects a malformed Authorization header: %s", async (authorization) => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", authorization)
      .expect(401);

    expect(response.headers["www-authenticate"]).toBe("Bearer");
    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a token with an invalid signature", async () => {
    const token = await createTestToken({ secret: alternateJwtSecret });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects an expired token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createTestToken({
      issuedAt: now - 120,
      expirationTime: now - 60,
    });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a token from the wrong issuer", async () => {
    const token = await createTestToken({ issuer: "another-api" });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a token for the wrong audience", async () => {
    const token = await createTestToken({ audience: "another-client" });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a token signed with an unsupported algorithm", async () => {
    const token = await createTestToken({ algorithm: "HS384" });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a token missing a required custom claim", async () => {
    const token = await createTestToken({ includeCompanyId: false });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it.each([
    ["invalid companyId", { companyId: "not-a-uuid" }],
    ["invalid role", { role: "SUPERUSER" }],
  ])("rejects a token with an %s claim", async (_label, overrides) => {
    const token = await createTestToken(overrides);
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a valid token whose User has been deleted", async () => {
    const token = await createTestToken({
      subject: deletedUserId,
      role: UserRole.STAFF,
    });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a valid token when the current User is inactive", async () => {
    const token = await createTestToken({
      subject: inactiveUserId,
      role: UserRole.STAFF,
    });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "ACCOUNT_INACTIVE",
        message: "This account is inactive",
      },
    });
    expect(response.body).not.toHaveProperty("data");
  });

  it("rejects a valid token whose companyId differs from the current User", async () => {
    const token = await createTestToken({ companyId: companyBId });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("rejects a valid token whose role differs from the current User", async () => {
    const token = await createTestToken({ role: UserRole.OWNER });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual(invalidTokenResponse);
  });

  it("derives company scope from req.auth and ignores a requested companyId", async () => {
    const token = await createTestToken();
    const response = await request(app)
      .get(`/api/v1/auth/me?companyId=${companyBId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ companyId: companyBId })
      .expect(200);

    expect(response.body.data.user).toMatchObject({
      id: activeUserId,
      companyId: companyAId,
    });
    expect(response.body.data.user.companyId).not.toBe(companyBId);
  });
});
