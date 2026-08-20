import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../shared/http/authentication.middleware.js";
import { requireAnyRole } from "../../shared/http/authorization.middleware.js";
import {
  postInventoryAdjustment,
  retrieveInventoryMovements,
} from "./inventory.controller.js";

export const inventoryRouter = Router();

inventoryRouter.get(
  "/products/:productId/inventory-movements",
  authenticate,
  retrieveInventoryMovements,
);
inventoryRouter.post(
  "/products/:productId/inventory-adjustments",
  authenticate,
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  postInventoryAdjustment,
);
