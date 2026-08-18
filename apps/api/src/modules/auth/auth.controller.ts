import type { NextFunction, Request, Response } from "express";

import { registrationSchema } from "./auth.schema.js";
import {
  EmailAlreadyExistsError,
  registerCompanyOwner,
} from "./auth.service.js";

export async function register(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = registrationSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Registration input is invalid",
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path[0]?.toString() ?? "request",
          message: issue.message,
        })),
      },
    });
    return;
  }

  try {
    const registration = await registerCompanyOwner(validationResult.data);

    response.status(201).json({
      status: "success",
      data: registration,
    });
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError) {
      response.status(409).json({
        status: "error",
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists",
        },
      });
      return;
    }

    next(error);
  }
}
