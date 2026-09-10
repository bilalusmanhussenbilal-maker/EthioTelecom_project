import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`survey-api listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
});

const shutdown = (signal: NodeJS.Signals): void => {
  logger.info(`${signal} received, shutting down`);
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, "Failed to close the HTTP server cleanly");
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
