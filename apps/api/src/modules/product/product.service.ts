import { prisma } from "../../config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { AuthenticatedRequestContext } from "../../shared/http/auth-context.js";

import type {
  ProductCreateInput,
  ProductListQuery,
  ProductUpdateInput,
} from "./product.schema.js";

const productSelect = {
  id: true,
  categoryId: true,
  sku: true,
  name: true,
  description: true,
  unit: true,
  costPrice: true,
  sellingPrice: true,
  quantityOnHand: true,
  reorderLevel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type SelectedProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product was not found");
    this.name = "ProductNotFoundError";
  }
}

export class SkuAlreadyExistsError extends Error {
  constructor() {
    super("A product with this SKU already exists");
    this.name = "SkuAlreadyExistsError";
  }
}

export class CategoryUnavailableError extends Error {
  constructor() {
    super("Category is unavailable for assignment");
    this.name = "CategoryUnavailableError";
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

function serializeProduct(product: SelectedProduct) {
  return {
    ...product,
    costPrice: product.costPrice.toFixed(2),
    sellingPrice: product.sellingPrice.toFixed(2),
    quantityOnHand: product.quantityOnHand.toFixed(3),
    reorderLevel: product.reorderLevel.toFixed(3),
  };
}

async function requireAssignableCategory(
  auth: AuthenticatedRequestContext,
  categoryId: string,
): Promise<void> {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      companyId: auth.companyId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!category) {
    throw new CategoryUnavailableError();
  }
}

export async function listProducts(
  auth: AuthenticatedRequestContext,
  query: ProductListQuery = {},
) {
  const products = await prisma.product.findMany({
    where: {
      companyId: auth.companyId,
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.lowStock
        ? {
            isActive: true,
            quantityOnHand: {
              lte: prisma.product.fields.reorderLevel,
            },
          }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: productSelect,
  });

  return products.map(serializeProduct);
}

export async function getProduct(
  auth: AuthenticatedRequestContext,
  productId: string,
) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId: auth.companyId,
    },
    select: productSelect,
  });

  if (!product) {
    throw new ProductNotFoundError();
  }

  return serializeProduct(product);
}

export async function createProduct(
  auth: AuthenticatedRequestContext,
  input: ProductCreateInput,
) {
  if (input.categoryId) {
    await requireAssignableCategory(auth, input.categoryId);
  }

  try {
    const product = await prisma.product.create({
      data: {
        companyId: auth.companyId,
        categoryId: input.categoryId ?? null,
        sku: input.sku,
        name: input.name,
        description: input.description ?? null,
        unit: input.unit,
        costPrice: input.costPrice,
        sellingPrice: input.sellingPrice,
        reorderLevel: input.reorderLevel ?? "0",
      },
      select: productSelect,
    });

    return serializeProduct(product);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SkuAlreadyExistsError();
    }

    throw error;
  }
}

export async function updateProduct(
  auth: AuthenticatedRequestContext,
  productId: string,
  input: ProductUpdateInput,
) {
  const existingProduct = await getProduct(auth, productId);

  if (Object.keys(input).length === 0) {
    return existingProduct;
  }

  if (input.categoryId) {
    await requireAssignableCategory(auth, input.categoryId);
  }

  try {
    const product = await prisma.product.update({
      where: {
        id_companyId: {
          id: productId,
          companyId: auth.companyId,
        },
      },
      data: input,
      select: productSelect,
    });

    return serializeProduct(product);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SkuAlreadyExistsError();
    }

    if (isRecordNotFoundError(error)) {
      throw new ProductNotFoundError();
    }

    throw error;
  }
}

export async function archiveProduct(
  auth: AuthenticatedRequestContext,
  productId: string,
) {
  const product = await getProduct(auth, productId);

  if (!product.isActive) {
    return product;
  }

  return updateProduct(auth, productId, { isActive: false });
}
