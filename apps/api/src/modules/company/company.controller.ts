import type { NextFunction, Request, Response } from "express";

import { getAuthenticatedRequestContext } from "../../shared/http/auth-context.js";
import { companyProfileUpdateSchema } from "./company.schema.js";
import {
  CompanyNotFoundError,
  getCompanyProfile,
  updateCompanyProfile,
} from "./company.service.js";

function sendCompanyNotFound(response: Response): void {
  response.status(404).json({
    status: "error",
    error: {
      code: "COMPANY_NOT_FOUND",
      message: "Company profile was not found",
    },
  });
}

export async function retrieveCompanyProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuthenticatedRequestContext(request);
    const company = await getCompanyProfile(auth);

    response.status(200).json({
      status: "success",
      data: { company },
    });
  } catch (error) {
    if (error instanceof CompanyNotFoundError) {
      sendCompanyNotFound(response);
      return;
    }

    next(error);
  }
}

export async function patchCompanyProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = companyProfileUpdateSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Company profile input is invalid",
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path[0]?.toString() ?? "request",
          message: issue.message,
        })),
      },
    });
    return;
  }

  try {
    const auth = getAuthenticatedRequestContext(request);
    const company = await updateCompanyProfile(auth, validationResult.data);

    response.status(200).json({
      status: "success",
      data: { company },
    });
  } catch (error) {
    if (error instanceof CompanyNotFoundError) {
      sendCompanyNotFound(response);
      return;
    }

    next(error);
  }
}
