import { prisma } from "../../config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { AuthenticatedRequestContext } from "../../shared/http/auth-context.js";

import type { CompanyProfileUpdateInput } from "./company.schema.js";

const companyProfileSelect = {
  id: true,
  name: true,
  registrationNumber: true,
  email: true,
  phone: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompanySelect;

export class CompanyNotFoundError extends Error {
  constructor() {
    super("Company was not found");
    this.name = "CompanyNotFoundError";
  }
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export async function getCompanyProfile(auth: AuthenticatedRequestContext) {
  const company = await prisma.company.findUnique({
    where: { id: auth.companyId },
    select: companyProfileSelect,
  });

  if (!company) {
    throw new CompanyNotFoundError();
  }

  return company;
}

export async function updateCompanyProfile(
  auth: AuthenticatedRequestContext,
  input: CompanyProfileUpdateInput,
) {
  if (Object.keys(input).length === 0) {
    return getCompanyProfile(auth);
  }

  try {
    return await prisma.company.update({
      where: { id: auth.companyId },
      data: input,
      select: companyProfileSelect,
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw new CompanyNotFoundError();
    }

    throw error;
  }
}
