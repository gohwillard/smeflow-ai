import "dotenv/config";

import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { hashPassword } from "../src/shared/security/password.js";

const runId = randomUUID();
const companyNamePrefix = `Phase 2C Test ${runId}`;
const emailMarker = `phase2c-${runId}`;
const validPassword = "correct horse battery staple";

function registrationInput(overrides: Record<string, unknown> = {}) {
  return {
    companyName: `${companyNamePrefix} Company`,
    firstName: "Ada",
    lastName: "Lovelace",
    email: `${emailMarker}@example.com`,
    password: validPassword,
    ...overrides,
  };
}

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: emailMarker,
      },
    },
  });
  await prisma.company.deleteMany({
    where: {
      name: {
        startsWith: companyNamePrefix,
      },
    },
  });
  await prisma.$disconnect();
});

describe("POST /api/v1/auth/register", () => {
  it("creates a company and normalized OWNER user with a safe response", async () => {
    const input = registrationInput({
      companyName: `  ${companyNamePrefix} Valid  `,
      firstName: "  Ada  ",
      lastName: "  Lovelace  ",
      email: `  ${emailMarker.toUpperCase()}@EXAMPLE.COM  `,
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(input)
      .expect(201);

    expect(response.body).toMatchObject({
      status: "success",
      data: {
        company: {
          name: `${companyNamePrefix} Valid`,
        },
        user: {
          email: `${emailMarker}@example.com`,
          firstName: "Ada",
          lastName: "Lovelace",
          role: "OWNER",
          isActive: true,
        },
      },
    });
    expect(response.body.data.company.id).toEqual(expect.any(String));
    expect(response.body.data.user.id).toEqual(expect.any(String));
    expect(response.body.data.user.createdAt).toEqual(expect.any(String));
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain(validPassword);

    const company = await prisma.company.findUnique({
      where: { id: response.body.data.company.id },
      include: { users: true },
    });

    expect(company).not.toBeNull();
    expect(company?.users).toHaveLength(1);
    expect(company?.users[0]).toMatchObject({
      companyId: company?.id,
      email: `${emailMarker}@example.com`,
      role: "OWNER",
      isActive: true,
    });
    expect(company?.users[0]?.passwordHash).not.toBe(validPassword);
    expect(company?.users[0]?.passwordHash).toMatch(
      /^scrypt\$v=1\$N=16384,r=8,p=1,dkLen=64\$[^$]+\$[^$]+$/,
    );
  });

  it("rejects a duplicate normalized email and rolls back its company", async () => {
    const duplicateEmail = `${emailMarker}-duplicate@example.com`;

    await request(app)
      .post("/api/v1/auth/register")
      .send(
        registrationInput({
          companyName: `${companyNamePrefix} Original`,
          email: duplicateEmail,
        }),
      )
      .expect(201);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(
        registrationInput({
          companyName: `${companyNamePrefix} Must Roll Back`,
          email: `  ${duplicateEmail.toUpperCase()}  `,
        }),
      )
      .expect(409);

    expect(response.body).toEqual({
      status: "error",
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists",
      },
    });
    expect(
      await prisma.company.findFirst({
        where: { name: `${companyNamePrefix} Must Roll Back` },
      }),
    ).toBeNull();
  });

  it("rejects an invalid email without returning the submitted value", async () => {
    const invalidEmail = "not-an-email";
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registrationInput({ email: invalidEmail }))
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toContainEqual({
      field: "email",
      message: "Email must be a valid email address",
    });
    expect(JSON.stringify(response.body)).not.toContain(invalidEmail);
  });

  it("rejects a password shorter than 15 characters without returning it", async () => {
    const shortPassword = "too short";
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registrationInput({ password: shortPassword }))
      .expect(400);

    expect(response.body.error.details).toContainEqual({
      field: "password",
      message: "Password must be at least 15 characters",
    });
    expect(JSON.stringify(response.body)).not.toContain(shortPassword);
  });

  it.each([
    ["companyName", "Company name must not be blank"],
    ["firstName", "First name must not be blank"],
    ["lastName", "Last name must not be blank"],
  ])("rejects a blank %s", async (field, message) => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registrationInput({ [field]: "   " }))
      .expect(400);

    expect(response.body.error.details).toContainEqual({ field, message });
  });
});

describe("hashPassword", () => {
  it("uses a random salt for each hash", async () => {
    const firstHash = await hashPassword(validPassword);
    const secondHash = await hashPassword(validPassword);

    expect(firstHash).not.toBe(secondHash);
  });
});
