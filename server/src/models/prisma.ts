import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";
import { isProduction } from "../config/env.js";

const globalForPrisma = globalThis as unknown as { prismaClient?: PrismaClient };

export const database =
  globalForPrisma.prismaClient ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.prismaClient = database;
}

const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();

export const prisma = new Proxy(database, {
  get(target, property) {
    const client = transactionContext.getStore() ?? target;
    const value: unknown = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function withTransactionClient<T>(tx: Prisma.TransactionClient, work: () => Promise<T>): Promise<T> {
  return transactionContext.run(tx, work);
}

export async function inTransaction<T>(
  work: () => Promise<T>,
  isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.Serializable,
): Promise<T> {
  if (transactionContext.getStore()) {
    return work();
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await database.$transaction(
        (tx) => withTransactionClient(tx, work),
        { ...TRANSACTION_OPTIONS, isolationLevel },
      );
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
      if (attempt < 4 && (code === "P2034" || code === "P2002")) {
        continue;
      }
      throw error;
    }
  }
}

/**
 * Interactive transactions default to a 5s timeout and a 2s wait. The hosted
 * pooler is slow enough that a multi-step write can exceed that, so the few
 * places that genuinely need atomicity opt into these more generous values.
 */
export const TRANSACTION_OPTIONS = { maxWait: 15_000, timeout: 45_000 };
