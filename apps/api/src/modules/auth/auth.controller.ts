import type { NextFunction, Request, Response } from "express";

import { getAuthenticatedRequestContext } from "../../shared/http/auth-context.js";
import { loginSchema, registrationSchema } from "./auth.schema.js";
import {
  AccountInactiveError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  getCurrentUser,
  loginUser,
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

export async function me(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuthenticatedRequestContext(request);
    const user = await getCurrentUser(auth);

    if (!user) {
      response.set("WWW-Authenticate", "Bearer").status(401).json({
        status: "error",
        error: {
          code: "INVALID_TOKEN",
          message: "Access token is invalid",
        },
      });
      return;
    }

    response.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validationResult = loginSchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Login input is invalid",
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path[0]?.toString() ?? "request",
          message: issue.message,
        })),
      },
    });
    return;
  }

  try {
    const authentication = await loginUser(validationResult.data);

    response.status(200).json({
      status: "success",
      data: authentication,
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      response.status(401).json({
        status: "error",
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
      return;
    }

    if (error instanceof AccountInactiveError) {
      response.status(403).json({
        status: "error",
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account is inactive",
        },
      });
      return;
    }

    next(error);
  }
}
