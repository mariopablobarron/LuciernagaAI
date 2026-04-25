import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type PrismaMigrationRow = {
  id: string;
  checksum: string;
  finished_at: Date | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date;
  applied_steps_count: number;
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  try {
    const rows = await prisma.$queryRawUnsafe<PrismaMigrationRow[]>(
      `SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
       FROM "_prisma_migrations"
       ORDER BY started_at DESC`,
    );

    const pending = rows.filter((r) => r.finished_at === null && r.rolled_back_at === null);
    const failed = rows.filter((r) => r.rolled_back_at !== null);
    const ok = rows.filter((r) => r.finished_at !== null && r.rolled_back_at === null).length;

    return NextResponse.json({
      summary: {
        total: rows.length,
        ok,
        pending: pending.length,
        rolledBack: failed.length,
      },
      pending: pending.map((r) => ({
        id: r.id,
        migration_name: r.migration_name,
        started_at: r.started_at,
        applied_steps_count: r.applied_steps_count,
        logs: r.logs ? r.logs.slice(0, 1500) : null,
      })),
      rolledBack: failed.map((r) => ({
        id: r.id,
        migration_name: r.migration_name,
        started_at: r.started_at,
        rolled_back_at: r.rolled_back_at,
        logs: r.logs ? r.logs.slice(0, 800) : null,
      })),
      lastApplied: rows
        .filter((r) => r.finished_at !== null)
        .slice(0, 5)
        .map((r) => ({
          migration_name: r.migration_name,
          finished_at: r.finished_at,
        })),
    });
  } catch (error) {
    logError("ADMIN_DIAG", error, { area: "migrations" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
