import { PrismaClient } from "@prisma/client";
import { isProduction } from "../config/env.js";

const globalForPrisma = globalThis as unknown as { prismaClient?: PrismaClient };

export const prisma =
  globalForPrisma.prismaClient ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.prismaClient = prisma;
}

/**
 * Interactive transactions default to a 5s timeout and a 2s wait. The hosted
 * pooler is slow enough that a multi-step write can exceed that, so the few
 * places that genuinely need atomicity opt into these more generous values.
 */
export const TRANSACTION_OPTIONS = { maxWait: 15_000, timeout: 45_000 };
