import cors from "cors";
import express from "express";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/api/v1/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "SMEFlow API",
  });
});

export { app };
