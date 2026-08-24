import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../shared/http/authentication.middleware.js";
import { requireAnyRole } from "../../shared/http/authorization.middleware.js";
import {
  deleteCustomer,
  patchCustomer,
  postCustomer,
  retrieveCustomer,
  retrieveCustomers,
} from "./customer.controller.js";

export const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get("/", retrieveCustomers);
customerRouter.get("/:customerId", retrieveCustomer);
customerRouter.post(
  "/",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  postCustomer,
);
customerRouter.patch(
  "/:customerId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  patchCustomer,
);
customerRouter.delete(
  "/:customerId",
  requireAnyRole(UserRole.OWNER, UserRole.ADMIN),
  deleteCustomer,
);
