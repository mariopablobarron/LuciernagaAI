import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { toCsv, csvResponse, stampFilename } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PERMISSION = "logs";
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;
const CSV_LIMIT = 10_000;

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const jobName = searchParams.get("jobName");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const format = searchParams.get("format");

    const where: Prisma.CronRunLogWhereInput = {};
    if (jobName) where.jobName = jobName;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) (where.startedAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.startedAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const prisma = getPrismaClient();

    if (format === "csv") {
      const rows = await prisma.cronRunLog.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: CSV_LIMIT,
      });
      const csv = toCsv(
        ["startedAt", "jobName", "status", "durationMs", "recordsProcessed", "finishedAt", "errorMessage"],
        rows.map((r) => [
          r.startedAt,
          r.jobName,
          r.status,
          r.durationMs,
          r.recordsProcessed,
          r.finishedAt,
          r.errorMessage,
        ]),
      );
      return csvResponse(csv, stampFilename("logs-cron"));
    }

    const [rows, statusCounts, jobNames, lastPerJob] = await Promise.all([
      prisma.cronRunLog.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.cronRunLog.groupBy({
        by: ["status"],
        where: dateFrom || dateTo ? { startedAt: where.startedAt } : undefined,
        _count: true,
      }),
      prisma.cronRunLog.groupBy({
        by: ["jobName"],
        _count: true,
        orderBy: { _count: { jobName: "desc" } },
        take: 20,
      }),
      prisma.$queryRaw<Array<{ jobName: string; startedAt: Date; status: string; durationMs: number | null }>>`
        SELECT DISTINCT ON ("jobName") "jobName", "startedAt", "status", "durationMs"
        FROM "CronRunLog"
        ORDER BY "jobName", "startedAt" DESC
      `,
    ]);

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      items,
      nextCursor: hasNext ? items[items.length - 1].id : null,
      counts: {
        byStatus: statusCounts.map((c) => ({ status: c.status, count: c._count })),
        byJob: jobNames.map((j) => ({ jobName: j.jobName, count: j._count })),
        lastPerJob,
      },
    });
  } catch (err) {
    logError("ADMIN_LOGS", err, { route: "/api/admin/logs/cron" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
