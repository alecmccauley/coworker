import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { z, ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { logger } from "../../config/index.js";

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: "Validation failed",
      errors: z.treeifyError(err),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  logger.error({ err: err instanceof Error ? err : String(err) }, "Unhandled error");

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: "error",
    message: "Internal server error",
  });
};
