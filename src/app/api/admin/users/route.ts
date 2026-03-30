import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type ListItem = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastSeen: string;
  state: string;
  riskLevel: string;
  crisisActive: boolean;
  plan: string;
  subscriptionStatus: string;
  profileTitle: string | null;
  streakDays: number;
  counts: {
    conversations: number;
    messages: number;
    goals: number;
    checkins7d: number;
    crisisEvents7d: number;
    avoidanceEvents7d: number;
  };
};

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

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const stateFilter = searchParams.get("state")?.trim() || "all";
    const riskOnly = searchParams.get("risk") === "1";

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = clamp(parsePositiveInt(searchParams.get("pageSize"), 20), 5, 100);

    const prisma = getPrismaClient();

    let stateUserIds: string[] | null = null;
    if (stateFilter !== "all" || riskOnly) {
      const stateWhere: {
        state?: string;
        OR?: Array<{ riskLevel: string } | { crisisActive: boolean }>;
      } = {};

      if (stateFilter !== "all") {
        stateWhere.state = stateFilter;
      }

      if (riskOnly) {
        stateWhere.OR = [{ riskLevel: "high" }, { riskLevel: "critical" }, { crisisActive: true }];
      }

      const matchingStates = await prisma.userState.findMany({
        where: stateWhere,
        select: { userId: true },
      });

      stateUserIds = matchingStates.map((item) => item.userId);
      if (stateUserIds.length === 0) {
        return NextResponse.json({
          items: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
          filters: { q: query, state: stateFilter, riskOnly },
        });
      }
    }

    const userWhere: {
      OR?: Array<
        | { email: { contains: string; mode: "insensitive" } }
        | { name: { contains: string; mode: "insensitive" } }
      >;
      id?: { in: string[] };
    } = {};

    if (query) {
      userWhere.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ];
    }

    if (stateUserIds) {
      userWhere.id = { in: stateUserIds };
    }

    const total = await prisma.user.count({ where: userWhere });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const safePage = totalPages > 0 ? clamp(page, 1, totalPages) : 1;

    const users = await prisma.user.findMany({
      where: userWhere,
      orderBy: [{ lastSeen: "desc" }, { createdAt: "desc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastSeen: true,
        _count: {
          select: {
            conversations: true,
            messages: true,
            goals: true,
          },
        },
      },
    });

    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) {
      return NextResponse.json({
        items: [],
        pagination: { page: safePage, pageSize, total, totalPages },
        filters: { q: query, state: stateFilter, riskOnly },
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [states, profiles, streaks, subscriptions, checkins7d, crisis7d, avoidance7d] =
      await Promise.all([
        prisma.userState.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, state: true, riskLevel: true, crisisActive: true },
        }),
        prisma.userProfile.findMany({
          where: { userId: { in: userIds } },
          include: {
            profile: {
              select: {
                title: true,
              },
            },
          },
        }),
        prisma.streak.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, currentDays: true },
        }),
        prisma.subscription.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, plan: true, status: true, createdAt: true },
          orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
        }),
        prisma.dailyCheckin.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, createdAt: { gte: sevenDaysAgo } },
          _count: { _all: true },
        }),
        prisma.crisisEvent.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, createdAt: { gte: sevenDaysAgo } },
          _count: { _all: true },
        }),
        prisma.avoidanceEvent.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, createdAt: { gte: sevenDaysAgo } },
          _count: { _all: true },
        }),
      ]);

    const stateByUser = new Map(states.map((item) => [item.userId, item]));
    const profileByUser = new Map(profiles.map((item) => [item.userId, item]));
    const streakByUser = new Map(streaks.map((item) => [item.userId, item.currentDays]));

    const latestSubscriptionByUser = new Map<string, { plan: string; status: string }>();
    for (const subscription of subscriptions) {
      if (!latestSubscriptionByUser.has(subscription.userId)) {
        latestSubscriptionByUser.set(subscription.userId, {
          plan: subscription.plan,
          status: subscription.status,
        });
      }
    }

    const checkins7dByUser = new Map(checkins7d.map((item) => [item.userId, item._count._all]));
    const crisis7dByUser = new Map(crisis7d.map((item) => [item.userId, item._count._all]));
    const avoidance7dByUser = new Map(avoidance7d.map((item) => [item.userId, item._count._all]));

    const items: ListItem[] = users.map((user) => {
      const state = stateByUser.get(user.id);
      const profile = profileByUser.get(user.id);
      const subscription = latestSubscriptionByUser.get(user.id);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastSeen: user.lastSeen.toISOString(),
        state: state?.state || "neutral",
        riskLevel: state?.riskLevel || "low",
        crisisActive: Boolean(state?.crisisActive),
        plan: subscription?.plan || "free",
        subscriptionStatus: subscription?.status || "inactive",
        profileTitle: profile?.profile?.title || null,
        streakDays: streakByUser.get(user.id) || 0,
        counts: {
          conversations: user._count.conversations,
          messages: user._count.messages,
          goals: user._count.goals,
          checkins7d: checkins7dByUser.get(user.id) || 0,
          crisisEvents7d: crisis7dByUser.get(user.id) || 0,
          avoidanceEvents7d: avoidance7dByUser.get(user.id) || 0,
        },
      };
    });

    return NextResponse.json({
      items,
      pagination: { page: safePage, pageSize, total, totalPages },
      filters: { q: query, state: stateFilter, riskOnly },
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "/api/admin/users" });
    return NextResponse.json(
      { error: "ADMIN_USERS_FAILED", message: "No se pudo cargar el listado de usuarios." },
      { status: 500 }
    );
  }
}
