import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { cache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "degraded" | "down";

type HealthResponse = {
  status: CheckStatus;
  uptime: number;
  timestamp: string;
  checks: {
    database: CheckStatus;
    env: CheckStatus;
    missingVars: string[];
    migrations: CheckStatus;
    failedMigrations: string[];
  };
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
};

const CRITICAL_VARS = [
  "DATABASE_URL",
  "AUTH_TOKEN_SECRET",
  "OPENROUTER_API_KEY",
] as const;

async function checkDatabase(): Promise<CheckStatus> {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "down";
  }
}

async function checkMigrations(): Promise<{ status: CheckStatus; failed: string[] }> {
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
        AND started_at IS NOT NULL
    `;
    const failed = rows.map((r) => r.migration_name);
    return { status: failed.length === 0 ? "ok" : "down", failed };
  } catch {
    return { status: "down", failed: [] };
  }
}

function checkEnv(): { status: CheckStatus; missing: string[] } {
  const missing = CRITICAL_VARS.filter((v) => !process.env[v]?.trim());
  return {
    status: missing.length === 0 ? "ok" : "degraded",
    missing,
  };
}

function getMemoryMb() {
  const mem = process.memoryUsage();
  const toMb = (bytes: number) => Math.round(bytes / 1024 / 1024);
  return {
    heapUsedMb: toMb(mem.heapUsed),
    heapTotalMb: toMb(mem.heapTotal),
    rssMb: toMb(mem.rss),
  };
}

const HEALTH_CACHE_TTL_MS = 10 * 1000; // 10 seconds

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const body = await cache.get<HealthResponse>(
    "health:check",
    HEALTH_CACHE_TTL_MS,
    async () => {
      const [dbStatus, envCheck, migrationsCheck] = await Promise.all([
        checkDatabase(),
        Promise.resolve(checkEnv()),
        checkMigrations(),
      ]);

      const overallStatus: CheckStatus =
        dbStatus === "down" || migrationsCheck.status === "down"
          ? "down"
          : envCheck.status === "degraded"
          ? "degraded"
          : "ok";

      return {
        status: overallStatus,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        checks: {
          database: dbStatus,
          env: envCheck.status,
          missingVars: envCheck.missing,
          migrations: migrationsCheck.status,
          failedMigrations: migrationsCheck.failed,
        },
        memory: getMemoryMb(),
      };
    },
  );

  return NextResponse.json(body, {
    status: body.status === "down" ? 503 : 200,
  });
}
