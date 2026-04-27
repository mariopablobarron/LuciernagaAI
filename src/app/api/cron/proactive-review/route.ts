import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { notifyAdmin } from "@/services/telegram";
import { logInfo, logError } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

// GET /api/cron/proactive-review?secret=CRON_SECRET
// Run daily at 08:00. Detects users at risk and alerts the admin.
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const prisma = getPrismaClient();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  try {
    // 1. Users with sustained medium+ risk (riskLevel != "low" for 3+ days)
    const riskyUsers = await prisma.userState.findMany({
      where: {
        riskLevel: { in: ["medium", "high"] },
        updatedAt: { lte: threeDaysAgo },
        crisisActive: false,
      },
      select: { userId: true, riskLevel: true, state: true, primaryEmotion: true },
    });

    // 2. Users with high avoidance (3+ avoidance events in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const avoidanceAgg = await prisma.avoidanceEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    });

    // 3. Users inactive 3+ days but were previously active
    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastSeen: { lte: threeDaysAgo, gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        isActive: true,
        messageCount: { gte: 5 },
      },
      select: { id: true, name: true, email: true, lastSeen: true },
      take: 20,
    });

    const alerts: string[] = [];

    // Build alert for risky users
    if (riskyUsers.length > 0) {
      const lines = riskyUsers.map(
        (u) => `  · \`${u.userId.slice(0, 12)}\` — riesgo: *${u.riskLevel}* — estado: ${u.state} — emoción: ${u.primaryEmotion}`
      );
      alerts.push(`🟡 *Riesgo sostenido (${riskyUsers.length} usuarios):*\n${lines.join("\n")}`);
    }

    // Build alert for avoidance patterns
    if (avoidanceAgg.length > 0) {
      const lines = avoidanceAgg.map(
        (a) => `  · \`${a.userId.slice(0, 12)}\` — ${a._count.id} evitaciones en 7 días`
      );
      alerts.push(`🟠 *Patrón de evitación (${avoidanceAgg.length} usuarios):*\n${lines.join("\n")}`);
    }

    // Build alert for inactive users
    if (inactiveUsers.length > 0) {
      const lines = inactiveUsers.map((u) => {
        const days = Math.floor((Date.now() - u.lastSeen.getTime()) / (24 * 60 * 60 * 1000));
        return `  · ${u.name ?? u.email} — ${days} días sin actividad`;
      });
      alerts.push(`🔵 *Usuarios en riesgo de abandono (${inactiveUsers.length}):*\n${lines.join("\n")}`);
    }

    // Send combined alert
    if (alerts.length > 0) {
      const report = [
        `📋 *Revisión proactiva diaria — Tres Mil Millones de Latidos*`,
        `_${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}_`,
        ``,
        ...alerts,
        ``,
        `_Revisa estos usuarios en el panel clínico._`,
      ].join("\n");

      notifyAdmin(report);
    }

    const stats = {
      riskyUsers: riskyUsers.length,
      avoidancePatterns: avoidanceAgg.length,
      inactiveUsers: inactiveUsers.length,
      alertsSent: alerts.length > 0,
    };

    logInfo("CRON", "proactive_review_done", stats);
    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    logError("CRON", error, { action: "proactive_review_failed" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: proactive-review", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
