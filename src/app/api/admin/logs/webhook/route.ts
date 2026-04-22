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
    const source = searchParams.get("source");
    const status = searchParams.get("status");
    const event = searchParams.get("event");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const format = searchParams.get("format");

    const where: Prisma.WebhookLogWhereInput = {};
    if (source) where.source = source;
    if (status) where.status = status;
    if (event) where.event = event;
    if (dateFrom || dateTo) {
      where.receivedAt = {};
      if (dateFrom) (where.receivedAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.receivedAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const prisma = getPrismaClient();

    if (format === "csv") {
      const rows = await prisma.webhookLog.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: CSV_LIMIT,
      });
      const csv = toCsv(
        ["receivedAt", "source", "event", "status", "signatureValid", "statusCode", "durationMs", "errorMessage"],
        rows.map((r) => [
          r.receivedAt,
          r.source,
          r.event,
          r.status,
          r.signatureValid,
          r.statusCode,
          r.durationMs,
          r.errorMessage,
        ]),
      );
      return csvResponse(csv, stampFilename("logs-webhook"));
    }

    const [rows, statusCounts, sourceCounts, events] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.webhookLog.groupBy({
        by: ["status"],
        where: dateFrom || dateTo ? { receivedAt: where.receivedAt } : undefined,
        _count: true,
      }),
      prisma.webhookLog.groupBy({
        by: ["source"],
        _count: true,
        orderBy: { _count: { source: "desc" } },
      }),
      prisma.webhookLog.groupBy({
        by: ["event"],
        where: { event: { not: null } },
        _count: true,
        orderBy: { _count: { event: "desc" } },
        take: 20,
      }),
    ]);

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      items,
      nextCursor: hasNext ? items[items.length - 1].id : null,
      counts: {
        byStatus: statusCounts.map((c) => ({ status: c.status, count: c._count })),
        bySource: sourceCounts.map((s) => ({ source: s.source, count: s._count })),
        topEvents: events.map((e) => ({ event: e.event, count: e._count })),
      },
    });
  } catch (err) {
    logError("ADMIN_LOGS", err, { route: "/api/admin/logs/webhook" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
