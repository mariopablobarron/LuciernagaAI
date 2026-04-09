import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/operations
 *
 * Returns operational data for the admin panel:
 * - Recent system events (errors, warnings, notable events)
 * - Backup-related admin snapshots
 * - System health recommendations
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  const prisma = getPrismaClient();

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Backup history from AdminSnapshot
    const backups = await prisma.adminSnapshot.findMany({
      where: { type: { in: ["backup", "scheduled", "manual"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, label: true, summary: true, recordCount: true, createdAt: true },
    });

    // Recent crisis events (as operational concern)
    const crisisCount7d = await prisma.crisisEvent.count({
      where: { createdAt: { gte: sevenDaysAgo }, level: { in: ["high", "critical"] } },
    });

    // Users without email verification
    const unverifiedCount = await prisma.user.count({
      where: { emailVerified: false, passwordHash: { not: null }, createdAt: { gte: thirtyDaysAgo } },
    });

    // Failed or inactive subscriptions
    const failedSubs = await prisma.subscription.count({
      where: { status: { in: ["past_due", "incomplete"] } },
    });

    // Avoidance spike detection (compare last 7d vs previous 7d)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const [avoidance7d, avoidancePrev7d] = await Promise.all([
      prisma.avoidanceEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.avoidanceEvent.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    ]);

    // Users inactive 7+ days (had activity in last 30d but not in last 7d)
    const inactiveUsers = await prisma.user.count({
      where: {
        isActive: true,
        lastSeen: { gte: thirtyDaysAgo, lt: sevenDaysAgo },
        passwordHash: { not: null },
      },
    });

    // LLM usage last 7 days
    const llmCost = await prisma.llmLog.aggregate({
      where: { createdAt: { gte: sevenDaysAgo } },
      _sum: { totalTokens: true },
      _count: true,
    });

    // Telegram bot health - users with telegram linked
    const telegramUsers = await prisma.user.count({ where: { telegramId: { not: null }, isActive: true } });

    // Org count
    const orgCount = await prisma.organization.count({ where: { isActive: true } });

    // Build recommendations
    const recommendations: Array<{ level: "info" | "warning" | "critical"; message: string; area: string }> = [];

    if (backups.length === 0) {
      recommendations.push({ level: "critical", area: "Backups", message: "No hay backups registrados. Configura el cron de backup diario." });
    } else {
      const lastBackup = backups[0];
      const hoursSinceBackup = (now.getTime() - new Date(lastBackup.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceBackup > 48) {
        recommendations.push({ level: "warning", area: "Backups", message: `Ultimo backup hace ${Math.round(hoursSinceBackup)}h. Deberia ser diario.` });
      }
    }

    if (crisisCount7d > 0) {
      recommendations.push({ level: "critical", area: "Crisis", message: `${crisisCount7d} eventos de crisis esta semana. Revisar panel de crisis.` });
    }

    if (unverifiedCount > 5) {
      recommendations.push({ level: "warning", area: "Auth", message: `${unverifiedCount} usuarios registrados sin verificar email (30d).` });
    }

    if (failedSubs > 0) {
      recommendations.push({ level: "warning", area: "Billing", message: `${failedSubs} suscripciones con pago fallido o incompleto.` });
    }

    if (avoidancePrev7d > 0 && avoidance7d > avoidancePrev7d * 1.5) {
      recommendations.push({ level: "warning", area: "Engagement", message: `Evitaciones subieron un ${Math.round(((avoidance7d - avoidancePrev7d) / avoidancePrev7d) * 100)}% vs semana anterior.` });
    }

    if (inactiveUsers > 10) {
      recommendations.push({ level: "info", area: "Retencion", message: `${inactiveUsers} usuarios inactivos 7+ dias. Considerar campaña de reactivacion.` });
    }

    if (!process.env.SENTRY_DSN) {
      recommendations.push({ level: "warning", area: "Monitoring", message: "Sentry no configurado. Los errores en produccion no se estan capturando." });
    }

    if (!process.env.RESEND_API_KEY) {
      recommendations.push({ level: "critical", area: "Email", message: "RESEND_API_KEY no configurada. Los emails no se estan enviando." });
    }

    if (!process.env.LOGTAIL_SOURCE_TOKEN) {
      recommendations.push({ level: "info", area: "Monitoring", message: "Logtail no configurado. Los logs solo se ven en consola del servidor." });
    }

    // Sort: critical first, then warning, then info
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    recommendations.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

    return NextResponse.json({
      ok: true,
      backups,
      stats: {
        crisisCount7d,
        unverifiedCount,
        failedSubs,
        avoidance7d,
        avoidanceTrend: avoidancePrev7d > 0 ? Math.round(((avoidance7d - avoidancePrev7d) / avoidancePrev7d) * 100) : 0,
        inactiveUsers,
        llmCalls7d: llmCost._count,
        llmTokens7d: llmCost._sum.totalTokens ?? 0,
        telegramUsers,
        orgCount,
      },
      recommendations,
    });
  } catch (error) {
    logError("ADMIN", error, { action: "operations_fetch" });
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}
