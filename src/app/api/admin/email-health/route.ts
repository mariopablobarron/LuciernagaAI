import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/admin/email-health
// Resumen rápido de EmailLog en las últimas 24 h + últimos errores +
// estado de configuración (RESEND_API_KEY presente, EMAIL_FROM resuelto).
// Pensado para diagnosticar "no llegan los emails" en 1 llamada.
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "logs");
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [byStatus, lastFailed, lastSent] = await Promise.all([
      prisma.emailLog.groupBy({
        by: ["status"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.emailLog.findMany({
        where: { status: "failed" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          template: true,
          to: true,
          subject: true,
          errorMessage: true,
        },
      }),
      prisma.emailLog.findFirst({
        where: { status: "sent" },
        orderBy: { sentAt: "desc" },
        select: {
          id: true,
          sentAt: true,
          template: true,
          to: true,
          providerId: true,
        },
      }),
    ]);

    const counts24h: Record<string, number> = {};
    for (const row of byStatus) counts24h[row.status] = row._count._all;

    const config = {
      hasResendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
      emailFrom: process.env.EMAIL_FROM?.trim() || null,
      appBaseUrl: process.env.APP_BASE_URL?.trim() || null,
    };

    // Hint rápido sobre el síntoma más probable
    let hint: string | null = null;
    if (!config.hasResendKey) {
      hint = "RESEND_API_KEY no configurada en Coolify.";
    } else if ((counts24h.failed ?? 0) > 0 && (counts24h.sent ?? 0) === 0) {
      hint = "Todos los envíos 24 h fallan. Mira lastFailed[0].errorMessage.";
    } else if ((counts24h.queued ?? 0) > 5 && (counts24h.sent ?? 0) === 0) {
      hint = "Muchos encolados sin enviar — comprueba que sendUserEmail llegue a ejecutarse.";
    } else if ((counts24h.sent ?? 0) === 0 && (counts24h.failed ?? 0) === 0 && (counts24h.queued ?? 0) === 0) {
      hint = "Cero emails en 24 h. Revisa si el flujo de negocio está llamando a sendUserEmail.";
    }

    return NextResponse.json({
      config,
      counts24h,
      lastFailed: lastFailed.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      lastSent: lastSent
        ? { ...lastSent, sentAt: lastSent.sentAt?.toISOString() ?? null }
        : null,
      hint,
    });
  } catch (error) {
    logError("admin.email_health", error, { route: "/api/admin/email-health" });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
