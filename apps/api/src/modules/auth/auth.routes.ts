import { Router } from "express";

import { authenticate } from "../../shared/http/authentication.middleware.js";
import { login, me, register } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", authenticate, me);
