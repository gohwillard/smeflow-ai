import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../shared/http/authentication.middleware.js";
import { requireAnyRole } from "../../shared/http/authorization.middleware.js";
import {
  patchCompanyProfile,
  retrieveCompanyProfile,
} from "./company.controller.js";

export const companyRouter = Router();

companyRouter.get("/profile", authenticate, retrieveCompanyProfile);
companyRouter.patch(
  "/profile",
  authenticate,
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  patchCompanyProfile,
);
