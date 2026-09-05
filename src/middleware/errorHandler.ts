import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { logger } from "../config/logger";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      logger.error({ err }, "Internal error");
    }
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  // Mongoose duplicate key error
  const anyErr = err as any;
  if (anyErr?.code === 11000) {
    res.status(409).json({
      error: { code: "CONFLICT", message: "A resource with the same unique field already exists." },
    });
    return;
  }

  // Mongoose validation error
  if (anyErr?.name === "ValidationError") {
    res.status(422).json({
      error: { code: "UNPROCESSABLE_ENTITY", message: anyErr.message },
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: env.isProd ? "Unexpected server error." : String(anyErr?.message || err),
    },
  });
}
