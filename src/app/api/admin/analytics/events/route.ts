import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { toCsv, csvResponse, stampFilename } from "@/lib/csv";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;
const CSV_LIMIT = 10_000;

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const cursor = searchParams.get("cursor");
    const format = searchParams.get("format");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const where: Prisma.EventWhereInput = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const prisma = getPrismaClient();

    if (format === "csv") {
      const rows = await prisma.event.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: CSV_LIMIT,
      });
      const csv = toCsv(
        ["createdAt", "type", "userId", "metadata"],
        rows.map((r) => [r.createdAt, r.type, r.userId, JSON.stringify(r.metadata ?? {})]),
      );
      return csvResponse(csv, stampFilename("events"));
    }

    const [rows, typeCounts, series] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.event.groupBy({
        by: ["type"],
        _count: true,
        orderBy: { _count: { type: "desc" } },
        take: 30,
      }),
      prisma.$queryRaw<Array<{ bucket: Date; type: string; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS bucket, "type", COUNT(*)::bigint AS count
        FROM "Event"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          ${type ? Prisma.sql`AND "type" = ${type}` : Prisma.empty}
        GROUP BY bucket, "type"
        ORDER BY bucket ASC
      `,
    ]);

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      items,
      nextCursor: hasNext ? items[items.length - 1].id : null,
      counts: {
        byType: typeCounts.map((c) => ({ type: c.type, count: c._count })),
      },
      series: series.map((s) => ({
        date: s.bucket.toISOString().slice(0, 10),
        type: s.type,
        count: Number(s.count),
      })),
    });
  } catch (err) {
    logError("ADMIN_ANALYTICS_EVENTS", err, { route: "/api/admin/analytics/events" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
