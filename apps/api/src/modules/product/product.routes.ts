import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../shared/http/authentication.middleware.js";
import { requireAnyRole } from "../../shared/http/authorization.middleware.js";
import {
  deleteProduct,
  patchProduct,
  postProduct,
  retrieveProduct,
  retrieveProducts,
} from "./product.controller.js";

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.get("/", retrieveProducts);
productRouter.get("/:productId", retrieveProduct);
productRouter.post(
  "/",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  postProduct,
);
productRouter.patch(
  "/:productId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  patchProduct,
);
productRouter.delete(
  "/:productId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  deleteProduct,
);
