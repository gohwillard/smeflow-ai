import { prisma } from "../../config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { AuthenticatedRequestContext } from "../../shared/http/auth-context.js";

import type {
  CategoryCreateInput,
  CategoryUpdateInput,
} from "./category.schema.js";

const categorySelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category was not found");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryAlreadyExistsError extends Error {
  constructor() {
    super("A category with this name already exists");
    this.name = "CategoryAlreadyExistsError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export function listCategories(auth: AuthenticatedRequestContext) {
  return prisma.category.findMany({
    where: { companyId: auth.companyId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: categorySelect,
  });
}

export async function getCategory(
  auth: AuthenticatedRequestContext,
  categoryId: string,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      companyId: auth.companyId,
    },
    select: categorySelect,
  });

  if (!category) {
    throw new CategoryNotFoundError();
  }

  return category;
}

export async function createCategory(
  auth: AuthenticatedRequestContext,
  input: CategoryCreateInput,
) {
  try {
    return await prisma.category.create({
      data: {
        companyId: auth.companyId,
        name: input.name,
        description: input.description ?? null,
      },
      select: categorySelect,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryAlreadyExistsError();
    }

    throw error;
  }
}

export async function updateCategory(
  auth: AuthenticatedRequestContext,
  categoryId: string,
  input: CategoryUpdateInput,
) {
  if (Object.keys(input).length === 0) {
    return getCategory(auth, categoryId);
  }

  try {
    return await prisma.category.update({
      where: {
        id_companyId: {
          id: categoryId,
          companyId: auth.companyId,
        },
      },
      data: input,
      select: categorySelect,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryAlreadyExistsError();
    }

    if (isRecordNotFoundError(error)) {
      throw new CategoryNotFoundError();
    }

    throw error;
  }
}

export async function archiveCategory(
  auth: AuthenticatedRequestContext,
  categoryId: string,
) {
  const category = await getCategory(auth, categoryId);

  if (!category.isActive) {
    return category;
  }

  return updateCategory(auth, categoryId, { isActive: false });
}
