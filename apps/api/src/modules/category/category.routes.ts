import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../shared/http/authentication.middleware.js";
import { requireAnyRole } from "../../shared/http/authorization.middleware.js";
import {
  deleteCategory,
  patchCategory,
  postCategory,
  retrieveCategories,
  retrieveCategory,
} from "./category.controller.js";

export const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.get("/", retrieveCategories);
categoryRouter.get("/:categoryId", retrieveCategory);
categoryRouter.post(
  "/",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  postCategory,
);
categoryRouter.patch(
  "/:categoryId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  patchCategory,
);
categoryRouter.delete(
  "/:categoryId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  deleteCategory,
);
