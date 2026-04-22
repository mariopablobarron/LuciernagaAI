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
    const level = searchParams.get("level");
    const tag = searchParams.get("tag");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const format = searchParams.get("format");

    const where: Prisma.SystemLogWhereInput = {};
    if (level) where.level = level;
    if (tag) where.tag = tag;
    if (userId) where.userId = userId;
    if (search) where.message = { contains: search, mode: "insensitive" };
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) (where.timestamp as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.timestamp as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const prisma = getPrismaClient();

    if (format === "csv") {
      const rows = await prisma.systemLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: CSV_LIMIT,
      });
      const csv = toCsv(
        ["timestamp", "level", "tag", "message", "userId", "route", "statusCode", "durationMs"],
        rows.map((r) => [
          r.timestamp,
          r.level,
          r.tag,
          r.message,
          r.userId,
          r.route,
          r.statusCode,
          r.durationMs,
        ]),
      );
      return csvResponse(csv, stampFilename("logs-system"));
    }

    const [rows, counts, tags] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          timestamp: true,
          level: true,
          tag: true,
          message: true,
          context: true,
          userId: true,
          route: true,
          statusCode: true,
          durationMs: true,
          stack: true,
        },
      }),
      prisma.systemLog.groupBy({
        by: ["level"],
        where: dateFrom || dateTo ? { timestamp: where.timestamp } : undefined,
        _count: true,
      }),
      prisma.systemLog.groupBy({
        by: ["tag"],
        where: dateFrom || dateTo ? { timestamp: where.timestamp } : undefined,
        _count: true,
        orderBy: { _count: { tag: "desc" } },
        take: 20,
      }),
    ]);

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      items,
      nextCursor: hasNext ? items[items.length - 1].id : null,
      counts: {
        byLevel: counts.map((c) => ({ level: c.level, count: c._count })),
        topTags: tags.map((t) => ({ tag: t.tag, count: t._count })),
      },
    });
  } catch (err) {
    logError("ADMIN_LOGS", err, { route: "/api/admin/logs/system" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
