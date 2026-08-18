import type { Request } from "express";

import type { UserRole } from "../../generated/prisma/client.js";

export interface AuthenticatedRequestContext {
  userId: string;
  companyId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestContext;
    }
  }
}

export function getAuthenticatedRequestContext(
  request: Request,
): AuthenticatedRequestContext {
  if (!request.auth) {
    throw new Error("Authenticated request context is unavailable");
  }

  return request.auth;
}
