import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import { getAuthenticatedRequestContext } from "../../shared/http/auth-context.js";
import {
  productCreateSchema,
  productIdParamsSchema,
  productListQuerySchema,
  productUpdateSchema,
} from "./product.schema.js";
import {
  CategoryUnavailableError,
  ProductNotFoundError,
  SkuAlreadyExistsError,
  archiveProduct,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "./product.service.js";

function sendValidationError(
  response: Response,
  message: string,
  error: ZodError,
): void {
  response.status(400).json({
    status: "error",
    error: {
      code: "VALIDATION_ERROR",
      message,
      details: error.issues.map((issue) => ({
        field: issue.path[0]?.toString() ?? "request",
        message: issue.message,
      })),
    },
  });
}

function parseProductId(request: Request, response: Response): string | null {
  const result = productIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    sendValidationError(response, "Product ID is invalid", result.error);
    return null;
  }

  return result.data.productId;
}

function handleProductError(error: unknown, response: Response): boolean {
  if (error instanceof ProductNotFoundError) {
    response.status(404).json({
      status: "error",
      error: { code: "PRODUCT_NOT_FOUND", message: "Product was not found" },
    });
    return true;
  }

  if (error instanceof SkuAlreadyExistsError) {
    response.status(409).json({
      status: "error",
      error: {
        code: "SKU_ALREADY_EXISTS",
        message: "A product with this SKU already exists",
      },
    });
    return true;
  }

  if (error instanceof CategoryUnavailableError) {
    response.status(400).json({
      status: "error",
      error: {
        code: "CATEGORY_UNAVAILABLE",
        message: "Category is unavailable for assignment",
      },
    });
    return true;
  }

  return false;
}

export async function retrieveProducts(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = productListQuerySchema.safeParse(request.query);
  if (!validationResult.success) {
    sendValidationError(
      response,
      "Product query is invalid",
      validationResult.error,
    );
    return;
  }

  try {
    const products = await listProducts(
      getAuthenticatedRequestContext(request),
      validationResult.data,
    );
    response.status(200).json({ status: "success", data: { products } });
  } catch (error) {
    next(error);
  }
}

export async function retrieveProduct(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const productId = parseProductId(request, response);
  if (!productId) return;

  try {
    const product = await getProduct(
      getAuthenticatedRequestContext(request),
      productId,
    );
    response.status(200).json({ status: "success", data: { product } });
  } catch (error) {
    if (!handleProductError(error, response)) next(error);
  }
}

export async function postProduct(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = productCreateSchema.safeParse(request.body);
  if (!validationResult.success) {
    sendValidationError(
      response,
      "Product input is invalid",
      validationResult.error,
    );
    return;
  }

  try {
    const product = await createProduct(
      getAuthenticatedRequestContext(request),
      validationResult.data,
    );
    response.status(201).json({ status: "success", data: { product } });
  } catch (error) {
    if (!handleProductError(error, response)) next(error);
  }
}

export async function patchProduct(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const productId = parseProductId(request, response);
  if (!productId) return;

  const validationResult = productUpdateSchema.safeParse(request.body);
  if (!validationResult.success) {
    sendValidationError(
      response,
      "Product input is invalid",
      validationResult.error,
    );
    return;
  }

  try {
    const product = await updateProduct(
      getAuthenticatedRequestContext(request),
      productId,
      validationResult.data,
    );
    response.status(200).json({ status: "success", data: { product } });
  } catch (error) {
    if (!handleProductError(error, response)) next(error);
  }
}

export async function deleteProduct(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const productId = parseProductId(request, response);
  if (!productId) return;

  try {
    const product = await archiveProduct(
      getAuthenticatedRequestContext(request),
      productId,
    );
    response.status(200).json({ status: "success", data: { product } });
  } catch (error) {
    if (!handleProductError(error, response)) next(error);
  }
}
