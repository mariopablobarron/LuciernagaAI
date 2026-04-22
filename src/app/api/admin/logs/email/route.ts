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
    const status = searchParams.get("status");
    const template = searchParams.get("template");
    const userId = searchParams.get("userId");
    const to = searchParams.get("to");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const format = searchParams.get("format");

    const where: Prisma.EmailLogWhereInput = {};
    if (status) where.status = status;
    if (template) where.template = template;
    if (userId) where.userId = userId;
    if (to) where.to = { contains: to, mode: "insensitive" };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const prisma = getPrismaClient();

    if (format === "csv") {
      const rows = await prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: CSV_LIMIT,
      });
      const csv = toCsv(
        ["createdAt", "status", "template", "to", "subject", "providerId", "errorMessage", "sentAt", "userId"],
        rows.map((r) => [
          r.createdAt,
          r.status,
          r.template,
          r.to,
          r.subject,
          r.providerId,
          r.errorMessage,
          r.sentAt,
          r.userId,
        ]),
      );
      return csvResponse(csv, stampFilename("logs-email"));
    }

    const [rows, statusCounts, templateCounts] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.emailLog.groupBy({
        by: ["status"],
        where: dateFrom || dateTo ? { createdAt: where.createdAt } : undefined,
        _count: true,
      }),
      prisma.emailLog.groupBy({
        by: ["template"],
        where: dateFrom || dateTo ? { createdAt: where.createdAt } : undefined,
        _count: true,
        orderBy: { _count: { template: "desc" } },
        take: 10,
      }),
    ]);

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      items,
      nextCursor: hasNext ? items[items.length - 1].id : null,
      counts: {
        byStatus: statusCounts.map((c) => ({ status: c.status, count: c._count })),
        byTemplate: templateCounts.map((c) => ({ template: c.template, count: c._count })),
      },
    });
  } catch (err) {
    logError("ADMIN_LOGS", err, { route: "/api/admin/logs/email" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
