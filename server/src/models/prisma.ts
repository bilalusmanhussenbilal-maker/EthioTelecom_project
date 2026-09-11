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
