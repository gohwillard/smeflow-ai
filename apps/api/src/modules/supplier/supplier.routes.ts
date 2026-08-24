import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../shared/http/authentication.middleware.js";
import { requireAnyRole } from "../../shared/http/authorization.middleware.js";
import {
  deleteSupplier,
  patchSupplier,
  postSupplier,
  retrieveSupplier,
  retrieveSuppliers,
} from "./supplier.controller.js";

export const supplierRouter = Router();

supplierRouter.use(authenticate);

supplierRouter.get("/", retrieveSuppliers);
supplierRouter.get("/:supplierId", retrieveSupplier);
supplierRouter.post(
  "/",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  postSupplier,
);
supplierRouter.patch(
  "/:supplierId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  patchSupplier,
);
supplierRouter.delete(
  "/:supplierId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  deleteSupplier,
);
