import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import { getAuthenticatedRequestContext } from "../../shared/http/auth-context.js";
import {
  categoryCreateSchema,
  categoryIdParamsSchema,
  categoryUpdateSchema,
} from "./category.schema.js";
import {
  CategoryAlreadyExistsError,
  CategoryNotFoundError,
  archiveCategory,
  createCategory,
  getCategory,
  listCategories,
  updateCategory,
} from "./category.service.js";

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

function sendCategoryNotFound(response: Response): void {
  response.status(404).json({
    status: "error",
    error: {
      code: "CATEGORY_NOT_FOUND",
      message: "Category was not found",
    },
  });
}

function sendCategoryConflict(response: Response): void {
  response.status(409).json({
    status: "error",
    error: {
      code: "CATEGORY_ALREADY_EXISTS",
      message: "A category with this name already exists",
    },
  });
}

function parseCategoryId(request: Request, response: Response): string | null {
  const result = categoryIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    sendValidationError(response, "Category ID is invalid", result.error);
    return null;
  }

  return result.data.categoryId;
}

function handleCategoryError(error: unknown, response: Response): boolean {
  if (error instanceof CategoryNotFoundError) {
    sendCategoryNotFound(response);
    return true;
  }

  if (error instanceof CategoryAlreadyExistsError) {
    sendCategoryConflict(response);
    return true;
  }

  return false;
}

export async function retrieveCategories(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await listCategories(
      getAuthenticatedRequestContext(request),
    );
    response.status(200).json({ status: "success", data: { categories } });
  } catch (error) {
    next(error);
  }
}

export async function retrieveCategory(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const categoryId = parseCategoryId(request, response);
  if (!categoryId) return;

  try {
    const category = await getCategory(
      getAuthenticatedRequestContext(request),
      categoryId,
    );
    response.status(200).json({ status: "success", data: { category } });
  } catch (error) {
    if (!handleCategoryError(error, response)) next(error);
  }
}

export async function postCategory(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = categoryCreateSchema.safeParse(request.body);

  if (!validationResult.success) {
    sendValidationError(
      response,
      "Category input is invalid",
      validationResult.error,
    );
    return;
  }

  try {
    const category = await createCategory(
      getAuthenticatedRequestContext(request),
      validationResult.data,
    );
    response.status(201).json({ status: "success", data: { category } });
  } catch (error) {
    if (!handleCategoryError(error, response)) next(error);
  }
}

export async function patchCategory(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const categoryId = parseCategoryId(request, response);
  if (!categoryId) return;

  const validationResult = categoryUpdateSchema.safeParse(request.body);

  if (!validationResult.success) {
    sendValidationError(
      response,
      "Category input is invalid",
      validationResult.error,
    );
    return;
  }

  try {
    const category = await updateCategory(
      getAuthenticatedRequestContext(request),
      categoryId,
      validationResult.data,
    );
    response.status(200).json({ status: "success", data: { category } });
  } catch (error) {
    if (!handleCategoryError(error, response)) next(error);
  }
}

export async function deleteCategory(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const categoryId = parseCategoryId(request, response);
  if (!categoryId) return;

  try {
    const category = await archiveCategory(
      getAuthenticatedRequestContext(request),
      categoryId,
    );
    response.status(200).json({ status: "success", data: { category } });
  } catch (error) {
    if (!handleCategoryError(error, response)) next(error);
  }
}
