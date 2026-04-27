import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendUserEmail, build24hNudgeEmail } from "@/lib/email";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { isSyntheticEmail } from "@/services/user";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/24h-nudge?secret=CRON_SECRET
 *
 * Finds users who signed up 20-28 hours ago, have 0 messages,
 * and sends them a personalized nudge email.
 * Run daily at 10:00 UTC.
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const prisma = getPrismaClient();
  const now = Date.now();
  // Window: signed up between 20h and 28h ago (captures ~24h regardless of exact cron time)
  const windowStart = new Date(now - 28 * 60 * 60 * 1000);
  const windowEnd = new Date(now - 20 * 60 * 60 * 1000);

  try {
    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: windowStart, lte: windowEnd },
        messageCount: 0,
        isActive: true,
      },
      select: { id: true, email: true, name: true },
      take: 200,
    });

    const appUrl = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";
    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      if (isSyntheticEmail(user.email)) {
        skipped++;
        continue;
      }

      try {
        const email = build24hNudgeEmail({ name: user.name, appUrl });
        const ok = await sendUserEmail({
          to: user.email,
          ...email,
          userId: user.id,
          template: "nudge_24h",
        });
        if (ok) sent++;
        else errors++;
        await new Promise((r) => setTimeout(r, 200)); // throttle
      } catch (err) {
        logError("CRON", err, { userId: user.id, action: "24h_nudge" });
        errors++;
      }
    }

    logInfo("CRON", "24h_nudge_done", { candidates: users.length, sent, skipped, errors });
    return NextResponse.json({ ok: true, candidates: users.length, sent, skipped, errors });
  } catch (error) {
    logError("CRON", error, { action: "24h_nudge_failed" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: 24h-nudge", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
