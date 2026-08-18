import { prisma } from "../../config/database.js";
import { Prisma, UserRole } from "../../generated/prisma/client.js";
import { signAccessToken } from "../../shared/security/jwt.js";
import {
  hashPassword,
  verifyPassword,
} from "../../shared/security/password.js";

import type { LoginInput, RegistrationInput } from "./auth.schema.js";

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountInactiveError extends Error {
  constructor() {
    super("Account is inactive");
    this.name = "AccountInactiveError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function registerCompanyOwner(input: RegistrationInput) {
  const passwordHash = await hashPassword(input.password);

  try {
    const company = await prisma.company.create({
      data: {
        name: input.companyName,
        users: {
          create: {
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            role: UserRole.OWNER,
          },
        },
      },
      select: {
        id: true,
        name: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    const [user] = company.users;

    if (!user) {
      throw new Error("Registration did not create an owner user");
    }

    return {
      company: {
        id: company.id,
        name: company.name,
      },
      user,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EmailAlreadyExistsError();
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      companyId: true,
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    throw new AccountInactiveError();
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  const token = await signAccessToken({
    userId: safeUser.id,
    companyId: safeUser.companyId,
    role: safeUser.role,
  });

  return {
    ...token,
    user: safeUser,
  };
}
