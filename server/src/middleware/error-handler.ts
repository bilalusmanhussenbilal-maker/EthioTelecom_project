import type { ErrorRequestHandler, RequestHandler } from "express";
import { isProduction } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isRecord(error)) {
    if (error.type === "entity.parse.failed") {
      return ApiError.badRequest("Request body is not valid JSON");
    }

    const status = typeof error.status === "number" ? error.status : undefined;
    const message = typeof error.message === "string" ? error.message : undefined;

    if (status !== undefined && status >= 400 && status < 500) {
      return new ApiError(status, message ?? "Request could not be processed");
    }
  }

  return ApiError.internal();
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const apiError = toApiError(error);

  if (apiError.statusCode >= 500) {
    logger.error({ err: error }, "Unhandled request error");
  }

  const body: ErrorResponseBody = {
    error: {
      code: apiError.code,
      message: apiError.message,
    },
  };

  if (apiError.details !== undefined) {
    body.error.details = apiError.details;
  }

  if (!isProduction && error instanceof Error && error.stack) {
    body.error.stack = error.stack;
  }

  res.status(apiError.statusCode).json(body);
};
