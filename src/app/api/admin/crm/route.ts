import { type NextRequest, NextResponse } from "next/server";
import { resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/crm?page=1&pageSize=50&search=&segment=all
 *
 * CRM view: all registered users with contact info, activity metrics,
 * and segmentation for marketing purposes.
 */
export async function GET(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get("pageSize") ?? 50)));
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const segment = req.nextUrl.searchParams.get("segment") ?? "all";

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      passwordHash: { not: null }, // Only real accounts, not anonymous
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    if (segment === "verified") where.emailVerified = true;
    else if (segment === "unverified") where.emailVerified = false;
    else if (segment === "active7d") where.lastSeen = { gte: sevenDaysAgo };
    else if (segment === "active30d") where.lastSeen = { gte: thirtyDaysAgo };
    else if (segment === "inactive") where.lastSeen = { lt: sevenDaysAgo };
    else if (segment === "telegram") where.telegramId = { not: null };
    else if (segment === "has_phone") where.phone = { not: null };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          createdAt: true,
          lastSeen: true,
          emailVerified: true,
          telegramId: true,
          source: true,
          messageCount: true,
          isActive: true,
          streak: { select: { currentDays: true } },
          userState: { select: { state: true, primaryEmotion: true } },
          goals: { where: { status: "active" }, select: { id: true }, take: 1 },
          subscriptions: { orderBy: { createdAt: "desc" as const }, select: { plan: true, status: true }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      createdAt: u.createdAt.toISOString(),
      lastSeen: u.lastSeen.toISOString(),
      emailVerified: u.emailVerified,
      hasTelegram: !!u.telegramId,
      source: u.source ?? "web",
      messageCount: u.messageCount,
      streakDays: u.streak?.currentDays ?? 0,
      state: u.userState?.state ?? "neutral",
      emotion: u.userState?.primaryEmotion ?? "calma",
      hasActiveGoal: u.goals.length > 0,
      plan: u.subscriptions[0]?.plan ?? "mvp_pro",
      isActive: u.isActive,
    }));

    // Segment counts
    const [totalAll, totalVerified, totalActive7d, totalTelegram, totalWithPhone] = await Promise.all([
      prisma.user.count({ where: { passwordHash: { not: null } } }),
      prisma.user.count({ where: { passwordHash: { not: null }, emailVerified: true } }),
      prisma.user.count({ where: { passwordHash: { not: null }, lastSeen: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { passwordHash: { not: null }, telegramId: { not: null } } }),
      prisma.user.count({ where: { passwordHash: { not: null }, phone: { not: null } } }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      segments: {
        all: totalAll,
        verified: totalVerified,
        active7d: totalActive7d,
        telegram: totalTelegram,
        has_phone: totalWithPhone,
      },
    });
  } catch (error) {
    logError("ADMIN", error, { action: "crm_fetch" });
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}
