import type { NextFunction, Request, Response } from "express";

import { prisma } from "../../config/database.js";
import {
  InvalidAccessTokenError,
  type VerifiedAccessTokenIdentity,
  verifyAccessToken,
} from "../security/jwt.js";

function sendAuthenticationRequired(response: Response): void {
  response.set("WWW-Authenticate", "Bearer").status(401).json({
    status: "error",
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required",
    },
  });
}

function sendInvalidToken(response: Response): void {
  response.set("WWW-Authenticate", "Bearer").status(401).json({
    status: "error",
    error: {
      code: "INVALID_TOKEN",
      message: "Access token is invalid",
    },
  });
}

function extractBearerToken(authorization: string): string | null {
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = request.get("authorization");

  if (!authorization) {
    sendAuthenticationRequired(response);
    return;
  }

  const token = extractBearerToken(authorization);

  if (!token) {
    sendInvalidToken(response);
    return;
  }

  let tokenIdentity: VerifiedAccessTokenIdentity;

  try {
    tokenIdentity = await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof InvalidAccessTokenError) {
      sendInvalidToken(response);
      return;
    }

    next(error);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: tokenIdentity.userId },
      select: {
        id: true,
        companyId: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      sendInvalidToken(response);
      return;
    }

    if (!user.isActive) {
      response.status(403).json({
        status: "error",
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account is inactive",
        },
      });
      return;
    }

    if (
      user.companyId !== tokenIdentity.companyId ||
      user.role !== tokenIdentity.role
    ) {
      sendInvalidToken(response);
      return;
    }

    request.auth = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
