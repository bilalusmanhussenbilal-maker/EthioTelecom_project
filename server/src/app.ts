import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express } from "express";
import helmet from "helmet";
import { isAllowedCorsOrigin } from "./config/cors.js";
import { env, isProduction } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { apiRouter } from "./routes/index.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      // The Next.js app is served from a different origin in production (Vercel + Render).
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, origin ?? true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use(env.API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}