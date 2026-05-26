import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendUserEmail } from "@/lib/email";
import { baseLayout } from "@/lib/email-layout";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { isSyntheticEmail } from "@/services/user";
import { getNotificationConfig } from "@/lib/notification-config";
import { requireCronSecret } from "@/lib/cron-auth";
import { withCronDedup, isoWeekKey } from "@/lib/cron-log";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_BASE_URL || "https://tresmilmillonesdelatidos.es";

export type InactiveUserData = {
  name: string | null;
  daysSinceLastSeen: number;
  lastGoalTitle: string | null;
  streakDays: number;
};

export function buildWeeklyInactiveReminderEmail(data: InactiveUserData): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, daysSinceLastSeen, lastGoalTitle, streakDays } = data;
  const greeting = name ? `Hola ${name}` : "Hola";
  const daysText = daysSinceLastSeen === 1 ? "1 dia" : `${daysSinceLastSeen} dias`;

  // Personalized subject
  const subject = lastGoalTitle
    ? `Tu meta "${lastGoalTitle}" te espera`
    : streakDays > 0
      ? `Llevabas ${streakDays} dias de racha — no la pierdas`
      : "¿Como estas? Tu mentor te espera";

  // Personalized body
  const contextLine = lastGoalTitle
    ? `Tu ultima meta era <strong style="color:#fff">"${lastGoalTitle}"</strong>. ¿Que paso con ella?`
    : streakDays > 0
      ? `Llegaste a una racha de <strong style="color:#fff">${streakDays} dias consecutivos</strong>. Ese esfuerzo no desaparece.`
      : `A veces volver es solo abrir la puerta y decir <em>"hoy estoy asi"</em>.`;

  const nudgeLine = lastGoalTitle
    ? "No tienes que resolver todo. Solo retoma el siguiente paso."
    : "No necesitas un plan. Solo di como te sientes hoy.";

  const text = [
    `${greeting},`,
    ``,
    `Llevas ${daysText} sin pasar por aqui.`,
    lastGoalTitle ? `Tu ultima meta era "${lastGoalTitle}". ¿Que paso?` : "",
    nudgeLine,
    ``,
    `${APP_URL}/app`,
  ].filter(Boolean).join("\n");

  const body = `
            <p style="margin:0 0 20px;font-size:22px;color:#fff;font-weight:700;letter-spacing:-0.3px">${greeting},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Llevas <strong style="color:#fff">${daysText}</strong> sin pasar por aqui.
            </p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a1a1aa">${contextLine}</p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#a1a1aa">${nudgeLine}</p>`;

  const html = baseLayout({
    theme: "dark",
    header: "branded",
    footer: "product",
    body,
    cta: { href: `${APP_URL}/app`, label: "Volver a mi espacio" },
  });

  return { subject, html, text };
}

// GET /api/cron/weekly-inactive-reminder?secret=CRON_SECRET
// Doble protección contra spam:
//   1. withCronDedup(isoWeekKey) → solo 1 ejecución por semana ISO completa.
//      Llamadas repetidas en la misma semana devuelven `dedup_lock` y NO
//      tocan la BD ni el sistema de email. Defensa contra cron-job.org
//      zombies y callers mal configurados.
//   2. Dedup interno por usuario (ScheduledEmail) — si por lo que sea el
//      cron acaba ejecutándose 2× (ej. semanas cruzadas o lock liberado),
//      ningún usuario recibe 2 emails en menos de 7 días.
async function handler(req: Request): Promise<Response> {
  const unauthorized = requireCronSecret(req as NextRequest);
  if (unauthorized) return unauthorized;

  const notifConfig = await getNotificationConfig();
  if (!notifConfig.cronWeeklyInactiveReminder) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled_in_config" });
  }

  const prisma = getPrismaClient();
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Users inactive for 7+ days who haven't opted out
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        lastSeen: { lt: sevenDaysAgo },
        OR: [
          { preferences: null },
          { preferences: { weeklyEmailEnabled: true } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastSeen: true,
        goals: {
          where: { status: "active" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { title: true },
        },
        streak: { select: { currentDays: true } },
      },
      take: 200,
    });

    // Dedup duro: si el usuario ya recibió un weekly_inactive en los últimos
    // 7 días, NO volver a mandar — aunque el endpoint sea llamado 100 veces.
    // Fix incidente 2026-05-25: un caller externo (probable cron-job.org
    // zombi) llamaba este endpoint cada 15 min → 22 emails × 5 ejecuciones
    // = 110 emails al mismo grupo de usuarios en 2 horas. Inaceptable.
    const candidateIds = users.map((u) => u.id);
    const recentSent = await prisma.scheduledEmail.findMany({
      where: {
        userId: { in: candidateIds },
        template: "weekly_inactive",
        OR: [
          { sentAt: { gte: sevenDaysAgo } },
          { scheduledAt: { gte: sevenDaysAgo }, cancelled: false, sentAt: null },
        ],
      },
      select: { userId: true },
    });
    const recentSentSet = new Set(recentSent.map((s) => s.userId));

    let sent = 0;
    let skipped = 0;
    let dedupSkipped = 0;
    let errors = 0;

    for (const user of users) {
      if (isSyntheticEmail(user.email)) {
        skipped++;
        continue;
      }
      if (recentSentSet.has(user.id)) {
        dedupSkipped++;
        continue;
      }

      try {
        const daysSinceLastSeen = Math.floor((Date.now() - new Date(user.lastSeen).getTime()) / (1000 * 60 * 60 * 24));
        const email = buildWeeklyInactiveReminderEmail({
          name: user.name,
          daysSinceLastSeen,
          lastGoalTitle: user.goals[0]?.title ?? null,
          streakDays: user.streak?.currentDays ?? 0,
        });
        const ok = await sendUserEmail({
          to: user.email,
          ...email,
          userId: user.id,
          template: "weekly_inactive",
        });
        if (ok) {
          // Registrar el envío para que el dedup funcione en la próxima llamada.
          // Fire-and-forget: si falla, el siguiente turn lo capturará igual
          // (el peor caso es 1 email duplicado por usuario, no 5).
          await prisma.scheduledEmail.create({
            data: {
              userId: user.id,
              template: "weekly_inactive",
              scheduledAt: now,
              sentAt: now,
            },
          }).catch((e) => {
            logError("CRON", e, { userId: user.id, action: "weekly_inactive_dedup_record_failed" });
          });
          sent++;
        } else errors++;
        await new Promise((r) => setTimeout(r, 200)); // throttle: 5 emails/sec max
      } catch (err) {
        logError("CRON", err, { userId: user.id, action: "weekly_inactive_reminder" });
        errors++;
      }
    }

    logInfo("CRON", "weekly_inactive_reminder_done", {
      candidates: users.length, sent, skipped, dedupSkipped, errors,
    });
    return NextResponse.json({
      ok: true,
      candidates: users.length,
      sent,
      skipped,
      dedupSkipped,
      errors,
    });
  } catch (error) {
    logError("CRON", error, { action: "weekly_inactive_reminder_failed" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: weekly-inactive-reminder", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronDedup(
  "weekly-inactive-reminder",
  () => isoWeekKey(),
  handler,
);
