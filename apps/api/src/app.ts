import cors from "cors";
import express from "express";

import { isDatabaseConnected } from "./config/database.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { companyRouter } from "./modules/company/company.routes.js";
import { errorHandler } from "./shared/http/error-handler.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  }),
);
app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/company", companyRouter);

app.get("/api/v1/health", async (_request, response) => {
  const databaseConnected = await isDatabaseConnected();

  if (!databaseConnected) {
    response.status(503).json({
      status: "error",
      service: "SMEFlow API",
      database: "disconnected",
    });
    return;
  }

  response.json({
    status: "ok",
    service: "SMEFlow API",
    database: "connected",
  });
});

app.use(errorHandler);

export { app };
