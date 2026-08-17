import cors from "cors";
import express from "express";

import { isDatabaseConnected } from "./config/database.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  }),
);
app.use(express.json());

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

export { app };
