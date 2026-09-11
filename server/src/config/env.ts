import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  API_PREFIX: z
    .string()
    .regex(/^\/[a-z0-9\-/]*$/, "must start with '/' and use only lowercase letters, digits, '-' or '/'")
    .default("/api/v1"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  DATABASE_URL: z.string().min(1, "is required - hosted PostgreSQL connection string"),

  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(43200),
  COOKIE_NAME: z.string().min(1).default("survey_session"),
  PASSWORD_HASH_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  GPS_MAX_ACCURACY_METERS: z.coerce.number().positive().default(150),
  GPS_SERVICE_RADIUS_METERS: z.coerce.number().positive().default(200),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
