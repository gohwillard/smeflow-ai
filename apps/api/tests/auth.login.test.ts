import "dotenv/config";

import { randomUUID } from "node:crypto";

import { decodeProtectedHeader, jwtVerify } from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { UserRole } from "../src/generated/prisma/client.js";
import {
  hashPassword,
  verifyPassword,
} from "../src/shared/security/password.js";

const runId = randomUUID();
const companyName = `Phase 2D Test ${runId}`;
const emailMarker = `phase2d-${runId}`;
const activeEmail = `${emailMarker}-active@example.com`;
const inactiveEmail = `${emailMarker}-inactive@example.com`;
const malformedHashEmail = `${emailMarker}-malformed@example.com`;
const historicalPasswordEmail = `${emailMarker}-historical@example.com`;
const activePassword = "  correct horse battery staple  ";
const inactivePassword = "inactive account test password";
const historicalShortPassword = "short";
const testJwtSecret = "phase-2d-test-secret-with-at-least-32-bytes";
const jwtIssuer = "smeflow-api";
const jwtAudience = "smeflow-web";
const jwtTtlSeconds = 30 * 60;

let companyId: string;
let activeUserId: string;
let activePasswordHash: string;

process.env.JWT_SECRET = testJwtSecret;
process.env.JWT_ISSUER = jwtIssuer;
process.env.JWT_AUDIENCE = jwtAudience;
process.env.JWT_ACCESS_TOKEN_TTL = "30m";

const invalidCredentialsResponse = {
  status: "error",
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
  },
};

beforeAll(async () => {
  activePasswordHash = await hashPassword(activePassword);

  const company = await prisma.company.create({
    data: {
      name: companyName,
      users: {
        create: [
          {
            email: activeEmail,
            passwordHash: activePasswordHash,
            firstName: "Grace",
            lastName: "Hopper",
            role: UserRole.ADMIN,
          },
          {
            email: inactiveEmail,
            passwordHash: await hashPassword(inactivePassword),
            firstName: "Inactive",
            lastName: "User",
            role: UserRole.STAFF,
            isActive: false,
          },
          {
            email: malformedHashEmail,
            passwordHash: "scrypt$v=1$malformed",
            firstName: "Malformed",
            lastName: "Hash",
            role: UserRole.STAFF,
          },
          {
            email: historicalPasswordEmail,
            passwordHash: await hashPassword(historicalShortPassword),
            firstName: "Historical",
            lastName: "Password",
            role: UserRole.OWNER,
          },
        ],
      },
    },
    include: { users: true },
  });

  companyId = company.id;
  const activeUser = company.users.find((user) => user.email === activeEmail);

  if (!activeUser) {
    throw new Error("Login test setup did not create the active user");
  }

  activeUserId = activeUser.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: emailMarker,
      },
    },
  });
  await prisma.company.deleteMany({ where: { name: companyName } });
  await prisma.$disconnect();
});

describe("POST /api/v1/auth/login", () => {
  it("normalizes email, verifies the exact password, and returns a signed JWT with safe user data", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `  ${activeEmail.toUpperCase()}  `,
        password: activePassword,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      status: "success",
      data: {
        accessToken: expect.any(String),
        expiresIn: jwtTtlSeconds,
        user: {
          id: activeUserId,
          companyId,
          email: activeEmail,
          firstName: "Grace",
          lastName: "Hopper",
          role: "ADMIN",
          isActive: true,
        },
      },
    });
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain(activePassword);

    const accessToken = response.body.data.accessToken as string;
    const protectedHeader = decodeProtectedHeader(accessToken);
    expect(protectedHeader).toMatchObject({ alg: "HS256", typ: "JWT" });

    const { payload } = await jwtVerify(
      accessToken,
      new TextEncoder().encode(testJwtSecret),
      {
        algorithms: ["HS256"],
        issuer: jwtIssuer,
        audience: jwtAudience,
      },
    );

    expect(payload.sub).toBe(activeUserId);
    expect(payload.companyId).toBe(companyId);
    expect(payload.role).toBe("ADMIN");
    expect(payload.iss).toBe(jwtIssuer);
    expect(payload.aud).toBe(jwtAudience);
    expect(payload.iat).toEqual(expect.any(Number));
    expect(payload.exp).toEqual(expect.any(Number));
    expect((payload.exp as number) - (payload.iat as number)).toBe(
      jwtTtlSeconds,
    );
  });

  it("does not trim the submitted password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: activeEmail, password: activePassword.trim() })
      .expect(401);

    expect(response.body).toEqual(invalidCredentialsResponse);
  });

  it("returns generic invalid credentials for an unknown email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `${emailMarker}-unknown@example.com`,
        password: activePassword,
      })
      .expect(401);

    expect(response.body).toEqual(invalidCredentialsResponse);
  });

  it("returns the same external error shape for a wrong password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: activeEmail, password: "wrong password" })
      .expect(401);

    expect(response.body).toEqual(invalidCredentialsResponse);
  });

  it("rejects an inactive account without issuing a token", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: inactiveEmail, password: inactivePassword })
      .expect(403);

    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "ACCOUNT_INACTIVE",
        message: "This account is inactive",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("accessToken");
  });

  it("treats a malformed stored password hash as invalid credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: malformedHashEmail, password: "any supplied password" })
      .expect(401);

    expect(response.body).toEqual(invalidCredentialsResponse);
  });

  it("accepts a supplied historical password without applying the registration minimum", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: historicalPasswordEmail,
        password: historicalShortPassword,
      })
      .expect(200);

    expect(response.body.data.user.email).toBe(historicalPasswordEmail);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it("requires a supplied password without echoing it", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: activeEmail, password: "" })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Login input is invalid",
    });
    expect(response.body.error.details).toContainEqual({
      field: "password",
      message: "Password is required",
    });
  });
});

describe("verifyPassword", () => {
  it("returns true only for the password represented by a valid stored hash", async () => {
    await expect(verifyPassword(activePassword, activePasswordHash)).resolves.toBe(
      true,
    );
    await expect(
      verifyPassword("incorrect password", activePasswordHash),
    ).resolves.toBe(false);
  });

  it.each([
    "",
    "scrypt$v=2$N=16384,r=8,p=1,dkLen=64$salt$hash",
    "scrypt$v=1$N=not-a-number,r=8,p=1,dkLen=64$salt$hash",
    "scrypt$v=1$N=1073741824,r=8,p=1,dkLen=64$c2FsdA$aGFzaA",
  ])("safely rejects malformed or unsupported stored hashes", async (hash) => {
    await expect(verifyPassword(activePassword, hash)).resolves.toBe(false);
  });
});
