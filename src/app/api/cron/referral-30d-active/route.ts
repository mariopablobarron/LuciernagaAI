import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { earnInvite } from "@/services/invites";
import { awardBadge } from "@/services/badges";

// GET /api/cron/referral-30d-active?secret=CRON_SECRET
// Run once daily. Grants an invitation + "active_30d" badge to users who
// signed up 30+ days ago and are still engaged (lastSeen within 7 days).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Candidates: signed up 30+ days ago, still active within last 7 days,
    // not soft-deleted, and haven't already received this milestone.
    const candidates = await prisma.user.findMany({
      where: {
        createdAt: { lte: thirtyDaysAgo },
        lastSeen: { gte: sevenDaysAgo },
        deletedAt: null,
        invitations: { none: { reason: "active_30d" } },
      },
      select: { id: true },
      take: 500, // safety cap per run
    });

    let granted = 0;
    let capped = 0;
    for (const u of candidates) {
      const code = await earnInvite(u.id, "active_30d");
      if (code) {
        granted++;
        void awardBadge(u.id, "active_30d").catch(() => {});
      } else {
        capped++;
      }
    }

    logInfo("CRON", "referral_30d_active_done", {
      candidates: candidates.length,
      granted,
      capped,
    });

    return NextResponse.json({ ok: true, candidates: candidates.length, granted, capped });
  } catch (error) {
    logError("CRON", error, { action: "referral_30d_active_failed" });
    sendAutomatedAlert({
      type: "critical",
      title: "Cron falló: referral-30d-active",
      message: error instanceof Error ? error.message : "Error desconocido",
    }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
