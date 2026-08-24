import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import { getAuthenticatedRequestContext } from "../../shared/http/auth-context.js";
import {
  supplierCreateSchema,
  supplierIdParamsSchema,
  supplierListQuerySchema,
  supplierUpdateSchema,
} from "./supplier.schema.js";
import {
  SupplierNotFoundError,
  archiveSupplier,
  createSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from "./supplier.service.js";

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

function parseSupplierId(request: Request, response: Response): string | null {
  const result = supplierIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    sendValidationError(response, "Supplier ID is invalid", result.error);
    return null;
  }

  return result.data.supplierId;
}

function handleSupplierError(error: unknown, response: Response): boolean {
  if (error instanceof SupplierNotFoundError) {
    response.status(404).json({
      status: "error",
      error: { code: "SUPPLIER_NOT_FOUND", message: "Supplier was not found" },
    });
    return true;
  }

  return false;
}

export async function retrieveSuppliers(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = supplierListQuerySchema.safeParse(request.query);
  if (!validationResult.success) {
    sendValidationError(response, "Supplier query is invalid", validationResult.error);
    return;
  }

  try {
    const suppliers = await listSuppliers(
      getAuthenticatedRequestContext(request),
      validationResult.data,
    );
    response.status(200).json({ status: "success", data: { suppliers } });
  } catch (error) {
    next(error);
  }
}

export async function retrieveSupplier(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const supplierId = parseSupplierId(request, response);
  if (!supplierId) return;

  try {
    const supplier = await getSupplier(
      getAuthenticatedRequestContext(request),
      supplierId,
    );
    response.status(200).json({ status: "success", data: { supplier } });
  } catch (error) {
    if (!handleSupplierError(error, response)) next(error);
  }
}

export async function postSupplier(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = supplierCreateSchema.safeParse(request.body);
  if (!validationResult.success) {
    sendValidationError(response, "Supplier input is invalid", validationResult.error);
    return;
  }

  try {
    const supplier = await createSupplier(
      getAuthenticatedRequestContext(request),
      validationResult.data,
    );
    response.status(201).json({ status: "success", data: { supplier } });
  } catch (error) {
    next(error);
  }
}

export async function patchSupplier(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const supplierId = parseSupplierId(request, response);
  if (!supplierId) return;

  const validationResult = supplierUpdateSchema.safeParse(request.body);
  if (!validationResult.success) {
    sendValidationError(response, "Supplier input is invalid", validationResult.error);
    return;
  }

  try {
    const supplier = await updateSupplier(
      getAuthenticatedRequestContext(request),
      supplierId,
      validationResult.data,
    );
    response.status(200).json({ status: "success", data: { supplier } });
  } catch (error) {
    if (!handleSupplierError(error, response)) next(error);
  }
}

export async function deleteSupplier(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const supplierId = parseSupplierId(request, response);
  if (!supplierId) return;

  try {
    const supplier = await archiveSupplier(
      getAuthenticatedRequestContext(request),
      supplierId,
    );
    response.status(200).json({ status: "success", data: { supplier } });
  } catch (error) {
    if (!handleSupplierError(error, response)) next(error);
  }
}
