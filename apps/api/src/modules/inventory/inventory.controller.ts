import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import { getAuthenticatedRequestContext } from "../../shared/http/auth-context.js";
import {
  inventoryAdjustmentSchema,
  inventoryProductIdParamsSchema,
} from "./inventory.schema.js";
import {
  InsufficientStockError,
  InventoryProductNotFoundError,
  OpeningBalanceNotAllowedError,
  ProductInactiveError,
  adjustInventory,
  listInventoryMovements,
} from "./inventory.service.js";

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
  const result = inventoryProductIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    sendValidationError(response, "Product ID is invalid", result.error);
    return null;
  }

  return result.data.productId;
}

function handleInventoryError(error: unknown, response: Response): boolean {
  if (error instanceof InventoryProductNotFoundError) {
    response.status(404).json({
      status: "error",
      error: { code: "PRODUCT_NOT_FOUND", message: "Product was not found" },
    });
    return true;
  }

  if (error instanceof ProductInactiveError) {
    response.status(409).json({
      status: "error",
      error: {
        code: "PRODUCT_INACTIVE",
        message: "Archived Products cannot receive inventory adjustments",
      },
    });
    return true;
  }

  if (error instanceof OpeningBalanceNotAllowedError) {
    response.status(409).json({
      status: "error",
      error: {
        code: "OPENING_BALANCE_NOT_ALLOWED",
        message: "Opening balance is not allowed for this Product",
      },
    });
    return true;
  }

  if (error instanceof InsufficientStockError) {
    response.status(409).json({
      status: "error",
      error: {
        code: "INSUFFICIENT_STOCK",
        message: "Insufficient stock for this adjustment",
      },
    });
    return true;
  }

  return false;
}

export async function retrieveInventoryMovements(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const productId = parseProductId(request, response);
  if (!productId) return;

  try {
    const movements = await listInventoryMovements(
      getAuthenticatedRequestContext(request),
      productId,
    );
    response.status(200).json({ status: "success", data: { movements } });
  } catch (error) {
    if (!handleInventoryError(error, response)) next(error);
  }
}

export async function postInventoryAdjustment(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const productId = parseProductId(request, response);
  if (!productId) return;

  const result = inventoryAdjustmentSchema.safeParse(request.body);
  if (!result.success) {
    sendValidationError(
      response,
      "Inventory adjustment input is invalid",
      result.error,
    );
    return;
  }

  try {
    const adjustment = await adjustInventory(
      getAuthenticatedRequestContext(request),
      productId,
      result.data,
    );
    response.status(201).json({ status: "success", data: adjustment });
  } catch (error) {
    if (!handleInventoryError(error, response)) next(error);
  }
}
