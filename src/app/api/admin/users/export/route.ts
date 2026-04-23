import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// GET /api/admin/users/export
// Streams a CSV with the full result of the current filter — no selection,
// no client-side pagination. Capped at 5000 rows for safety.
export async function GET(req: NextRequest) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const createdFrom = parseDate(searchParams.get("createdFrom"));
    const createdTo = parseDate(searchParams.get("createdTo"));
    const lastSeenFrom = parseDate(searchParams.get("lastSeenFrom"));
    const lastSeenTo = parseDate(searchParams.get("lastSeenTo"));
    const planFilter = searchParams.get("plan")?.trim() || "all";
    const includeDeleted = searchParams.get("includeDeleted") === "1";

    const where: Prisma.UserWhereInput = {};
    if (!includeDeleted) where.deletedAt = null;
    if (query) {
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ];
    }
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = createdFrom;
      if (createdTo) where.createdAt.lte = createdTo;
    }
    if (lastSeenFrom || lastSeenTo) {
      where.lastSeen = {};
      if (lastSeenFrom) where.lastSeen.gte = lastSeenFrom;
      if (lastSeenTo) where.lastSeen.lte = lastSeenTo;
    }
    if (planFilter === "pro") {
      where.subscriptions = { some: { plan: "pro", status: "active" as const } };
    }

    const prisma = getPrismaClient();

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ lastSeen: "desc" }, { createdAt: "desc" }],
      take: MAX_ROWS,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
        lastSeen: true,
        _count: { select: { messages: true, goals: true } },
        subscriptions: {
          where: { status: "active" as const },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { plan: true, status: true },
        },
      },
    });

    const header = [
      "id",
      "email",
      "name",
      "role",
      "plan",
      "isActive",
      "deletedAt",
      "createdAt",
      "lastSeen",
      "messages",
      "goals",
    ].join(",");

    const lines = users.map((u) =>
      [
        u.id,
        u.email,
        u.name ?? "",
        u.role,
        u.subscriptions[0]?.plan ?? "free",
        u.isActive,
        u.deletedAt?.toISOString() ?? "",
        u.createdAt.toISOString(),
        u.lastSeen.toISOString(),
        u._count.messages,
        u._count.goals,
      ]
        .map(csvEscape)
        .join(","),
    );

    const csv = [header, ...lines].join("\n");

    logInfo("ADMIN", "users_export_csv", { rows: users.length });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    logError("ADMIN", error, { route: "GET /api/admin/users/export" });
    return NextResponse.json(
      { error: "EXPORT_FAILED", message: "No se pudo exportar." },
      { status: 500 },
    );
  }
}
