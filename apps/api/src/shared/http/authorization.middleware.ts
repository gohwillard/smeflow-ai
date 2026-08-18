import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "../../generated/prisma/client.js";
import { getAuthenticatedRequestContext } from "./auth-context.js";

export function requireAnyRole(...allowedRoles: UserRole[]) {
  const allowedRoleSet = new Set(allowedRoles);

  return (request: Request, response: Response, next: NextFunction): void => {
    const auth = getAuthenticatedRequestContext(request);

    if (!allowedRoleSet.has(auth.role)) {
      response.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "You are not allowed to perform this action",
        },
      });
      return;
    }

    next();
  };
}
