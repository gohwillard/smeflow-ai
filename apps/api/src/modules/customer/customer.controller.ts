import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import { getAuthenticatedRequestContext } from "../../shared/http/auth-context.js";
import {
  customerCreateSchema,
  customerIdParamsSchema,
  customerListQuerySchema,
  customerUpdateSchema,
} from "./customer.schema.js";
import {
  CustomerNotFoundError,
  archiveCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "./customer.service.js";

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

function parseCustomerId(request: Request, response: Response): string | null {
  const result = customerIdParamsSchema.safeParse(request.params);

  if (!result.success) {
    sendValidationError(response, "Customer ID is invalid", result.error);
    return null;
  }

  return result.data.customerId;
}

function handleCustomerError(error: unknown, response: Response): boolean {
  if (error instanceof CustomerNotFoundError) {
    response.status(404).json({
      status: "error",
      error: { code: "CUSTOMER_NOT_FOUND", message: "Customer was not found" },
    });
    return true;
  }

  return false;
}

export async function retrieveCustomers(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = customerListQuerySchema.safeParse(request.query);
  if (!validationResult.success) {
    sendValidationError(response, "Customer query is invalid", validationResult.error);
    return;
  }

  try {
    const customers = await listCustomers(getAuthenticatedRequestContext(request));
    response.status(200).json({ status: "success", data: { customers } });
  } catch (error) {
    next(error);
  }
}

export async function retrieveCustomer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const customerId = parseCustomerId(request, response);
  if (!customerId) return;

  try {
    const customer = await getCustomer(
      getAuthenticatedRequestContext(request),
      customerId,
    );
    response.status(200).json({ status: "success", data: { customer } });
  } catch (error) {
    if (!handleCustomerError(error, response)) next(error);
  }
}

export async function postCustomer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = customerCreateSchema.safeParse(request.body);
  if (!validationResult.success) {
    sendValidationError(response, "Customer input is invalid", validationResult.error);
    return;
  }

  try {
    const customer = await createCustomer(
      getAuthenticatedRequestContext(request),
      validationResult.data,
    );
    response.status(201).json({ status: "success", data: { customer } });
  } catch (error) {
    next(error);
  }
}

export async function patchCustomer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const customerId = parseCustomerId(request, response);
  if (!customerId) return;

  const validationResult = customerUpdateSchema.safeParse(request.body);
  if (!validationResult.success) {
    sendValidationError(response, "Customer input is invalid", validationResult.error);
    return;
  }

  try {
    const customer = await updateCustomer(
      getAuthenticatedRequestContext(request),
      customerId,
      validationResult.data,
    );
    response.status(200).json({ status: "success", data: { customer } });
  } catch (error) {
    if (!handleCustomerError(error, response)) next(error);
  }
}

export async function deleteCustomer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const customerId = parseCustomerId(request, response);
  if (!customerId) return;

  try {
    const customer = await archiveCustomer(
      getAuthenticatedRequestContext(request),
      customerId,
    );
    response.status(200).json({ status: "success", data: { customer } });
  } catch (error) {
    if (!handleCustomerError(error, response)) next(error);
  }
}
