import { env } from "../config/env.js";

export interface HealthStatus {
  status: "ok";
  service: string;
  environment: string;
  apiPrefix: string;
  uptimeSeconds: number;
  timestamp: string;
}

const SERVICE_NAME = "survey-api";

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: SERVICE_NAME,
    environment: env.NODE_ENV,
    apiPrefix: env.API_PREFIX,
    uptimeSeconds: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString(),
  };
}
