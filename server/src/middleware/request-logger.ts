import type { RequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const context = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
    };
    const message = `${context.method} ${context.url} ${context.statusCode} ${context.durationMs}ms`;

    if (res.statusCode >= 500) {
      logger.error(context, message);
    } else if (res.statusCode >= 400) {
      logger.warn(context, message);
    } else {
      logger.info(context, message);
    }
  });

  next();
};
