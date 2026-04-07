import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logError, logWarn, logInfo } from "@/lib/logger";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("[DB] DATABASE_URL environment variable is not set");
  }

  const poolMax = parseInt(process.env.DATABASE_POOL_MAX ?? "20", 10);
  const adapter = new PrismaPg({
    connectionString,
    min: 5,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 20,
  });
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export function getExistingPrismaClient(): PrismaClient | undefined {
  return globalForPrisma.prisma;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (!globalForPrisma.prisma) return;
  await globalForPrisma.prisma.$disconnect();
  delete globalForPrisma.prisma;
}

/**
 * Verifies DB connectivity with exponential backoff.
 * Call once at startup (e.g. from health check or startup probe).
 * Does NOT throw — logs warn after exhausting retries.
 */
export async function connectWithRetry(
  maxAttempts = 3,
  baseDelayMs = 1_000
): Promise<boolean> {
  const prisma = getPrismaClient();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logInfo("DB", "connection_verified", { attempt });
      return true;
    } catch (error: unknown) {
      const isLast = attempt === maxAttempts;
      if (isLast) {
        logError("DB", error, { area: "connectWithRetry", attempt, maxAttempts });
      } else {
        const delay = baseDelayMs * 2 ** (attempt - 1);
        logWarn("DB", `connection_failed_retrying`, { attempt, maxAttempts, delayMs: delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return false;
}
