import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const adminAuth = resolveAdminAuth(req);
    if (!adminAuth.authenticated) {
      const unauthorized = NextResponse.json(
        { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
        { status: 401 }
      );
      if (adminAuth.source === "invalid") clearAdminSessionCookie(unauthorized);
      return unauthorized;
    }

    const prisma = getPrismaClient();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Run independent queries in parallel
    const [
      totalUsers,
      contacts,
      allPings,
      allMessages,
      recentCrisisUsers,
    ] = await Promise.all([
      // Total user count
      prisma.user.count(),

      // All trusted contacts with user info and relation counts
      prisma.trustedContact.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, name: true } },
          supportMessages: { select: { id: true } },
        },
      }),

      // All family pings
      prisma.familyPing.findMany({
        select: { id: true, respondedAt: true, response: true },
      }),

      // All support messages
      prisma.supportMessage.findMany({
        select: { id: true, deliveredAt: true, readAt: true },
      }),

      // Users with crisis events in last 30 days (grouped)
      prisma.crisisEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true, user: { select: { id: true, email: true, name: true } } },
      }),
    ]);

    // Count pings per trustedContactId (FamilyPing has no relation to TrustedContact in schema,
    // so we query separately)
    const pingsByContact = await prisma.familyPing.groupBy({
      by: ["trustedContactId"],
      _count: { id: true },
    });

    const pingCountMap = new Map<string, number>();
    for (const row of pingsByContact) {
      pingCountMap.set(row.trustedContactId, row._count.id);
    }

    // --- Overview ---
    const usersWithContactIds = new Set(contacts.map((c) => c.userId));
    const overview = {
      totalContacts: contacts.length,
      withCrisisNotify: contacts.filter((c) => c.notifyOnCrisis).length,
      withInactivityNotify: contacts.filter((c) => c.notifyOnInactivity).length,
      usersWithContact: usersWithContactIds.size,
      usersWithoutContact: totalUsers - usersWithContactIds.size,
    };

    // --- Pings ---
    const respondedPings = allPings.filter((p) => p.respondedAt !== null);
    const okCount = allPings.filter((p) => p.response === "ok").length;
    const notOkCount = allPings.filter((p) => p.response === "not_ok").length;
    const pings = {
      total: allPings.length,
      responded: respondedPings.length,
      responseRate: allPings.length > 0 ? respondedPings.length / allPings.length : 0,
      okCount,
      notOkCount,
    };

    // --- Messages ---
    const deliveredMessages = allMessages.filter((m) => m.deliveredAt !== null);
    const readMessages = allMessages.filter((m) => m.readAt !== null);
    const messages = {
      total: allMessages.length,
      delivered: deliveredMessages.length,
      read: readMessages.length,
      readRate: deliveredMessages.length > 0 ? readMessages.length / deliveredMessages.length : 0,
    };

    // --- Contacts list with per-contact counts ---
    const contactList = contacts.map((c) => ({
      id: c.id,
      userId: c.userId,
      userName: c.user.name,
      userEmail: c.user.email,
      name: c.name,
      email: c.email,
      phone: c.phone,
      relation: c.relation,
      shareProgress: c.shareProgress,
      shareWins: c.shareWins,
      shareStreak: c.shareStreak,
      notifyOnCrisis: c.notifyOnCrisis,
      notifyOnInactivity: c.notifyOnInactivity,
      inactivityDays: c.inactivityDays,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.supportMessages.length,
      pingCount: pingCountMap.get(c.id) ?? 0,
    }));

    // --- At-risk users without contact ---
    const crisisUserMap = new Map<
      string,
      { id: string; email: string; name: string | null; crisisCount: number }
    >();

    for (const event of recentCrisisUsers) {
      const existing = crisisUserMap.get(event.userId);
      if (existing) {
        existing.crisisCount += 1;
      } else {
        crisisUserMap.set(event.userId, {
          id: event.user.id,
          email: event.user.email,
          name: event.user.name,
          crisisCount: 1,
        });
      }
    }

    const atRiskWithoutContact = Array.from(crisisUserMap.values())
      .filter((u) => !usersWithContactIds.has(u.id))
      .sort((a, b) => b.crisisCount - a.crisisCount);

    return NextResponse.json({
      overview,
      pings,
      messages,
      contacts: contactList,
      atRiskWithoutContact,
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "GET /api/admin/family" });
    return NextResponse.json(
      { error: "FAMILY_OVERVIEW_FAILED", message: "No se pudo cargar el panel de familia." },
      { status: 500 }
    );
  }
}, { limit: 30 });
