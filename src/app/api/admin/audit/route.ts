import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const adminAuth = resolveAdminAuth(req);
    if (!adminAuth.authenticated) {
      const unauthorized = NextResponse.json(
        { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
        { status: 401 }
      );

      if (adminAuth.source === "invalid") {
        clearAdminSessionCookie(unauthorized);
      }

      return unauthorized;
    }

    const prisma = getPrismaClient();

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = clamp(parsePositiveInt(searchParams.get("pageSize"), 30), 1, 100);
    const typeFilter = searchParams.get("type")?.trim() || "";
    const userIdFilter = searchParams.get("userId")?.trim() || "";
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build the where clause for paginated events
    const eventsWhere: {
      type?: string;
      userId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (typeFilter) {
      eventsWhere.type = typeFilter;
    }
    if (userIdFilter) {
      eventsWhere.userId = userIdFilter;
    }
    if (from || to) {
      eventsWhere.createdAt = {};
      if (from) eventsWhere.createdAt.gte = from;
      if (to) eventsWhere.createdAt.lte = to;
    }

    // Run all queries in parallel
    const [
      totalEvents,
      eventsLast24h,
      eventsLast7d,
      eventTypeGroups,
      eventsTotal,
      events,
      recentSnapshots,
    ] = await Promise.all([
      // Stats: total events
      prisma.event.count(),

      // Stats: events last 24h
      prisma.event.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),

      // Stats: events last 7d
      prisma.event.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      // Event types with counts
      prisma.event.groupBy({
        by: ["type"],
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
      }),

      // Total for filtered pagination
      prisma.event.count({ where: eventsWhere }),

      // Paginated events with user info
      prisma.event.findMany({
        where: eventsWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          type: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),

      // Recent admin snapshots
      prisma.adminSnapshot.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          label: true,
          summary: true,
          recordCount: true,
          createdAt: true,
        },
      }),
    ]);

    const totalPages = eventsTotal === 0 ? 0 : Math.ceil(eventsTotal / pageSize);

    const eventTypes = eventTypeGroups.map((group) => ({
      type: group.type,
      count: group._count._all,
    }));

    return NextResponse.json({
      stats: {
        totalEvents,
        eventsLast24h,
        eventsLast7d,
        uniqueEventTypes: eventTypeGroups.length,
      },
      eventTypes,
      events: {
        items: events.map((event) => ({
          id: event.id,
          userId: event.userId,
          type: event.type,
          metadata: event.metadata,
          createdAt: event.createdAt.toISOString(),
          user: {
            email: event.user.email,
            name: event.user.name,
          },
        })),
        pagination: {
          page,
          pageSize,
          total: eventsTotal,
          totalPages,
        },
      },
      recentSnapshots: recentSnapshots.map((snapshot) => ({
        id: snapshot.id,
        type: snapshot.type,
        label: snapshot.label,
        summary: snapshot.summary,
        recordCount: snapshot.recordCount,
        createdAt: snapshot.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/audit" });
    return NextResponse.json(
      { error: "ADMIN_AUDIT_FAILED", message: "No se pudo cargar los datos de auditoría." },
      { status: 500 }
    );
  }
}, { limit: 30 });
