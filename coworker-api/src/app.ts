import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { StatusCodes } from "http-status-codes";
import { logger, env } from "./config/index.js";
import { errorHandler } from "./shared/index.js";
import { userRouter } from "./modules/users/index.js";
import { helloRouter } from "./modules/hello/index.js";

export const app: Express = express();

// Security middlewares
app.use(helmet());
app.use(cors());

// Request logging (disable in test environment)
if (env.NODE_ENV !== "test") {
  app.use(pinoHttp.default({ logger }));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/v1/hello", helloRouter);
app.use("/api/v1/users", userRouter);

// 404 handler
app.use((_req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: "error",
    message: "Route not found",
  });
});

// Global error handler
app.use(errorHandler);
