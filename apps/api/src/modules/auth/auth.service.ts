import { prisma } from "../../config/database.js";
import { Prisma, UserRole } from "../../generated/prisma/client.js";
import { hashPassword } from "../../shared/security/password.js";

import type { RegistrationInput } from "./auth.schema.js";

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailAlreadyExistsError";
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
