import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendUserEmail } from "@/lib/email";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { isSyntheticEmail } from "@/services/user";
import { getNotificationConfig } from "@/lib/notification-config";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_BASE_URL || "https://tresmilmillonesdelatidos.es";

type InactiveUserData = {
  name: string | null;
  daysSinceLastSeen: number;
  lastGoalTitle: string | null;
  streakDays: number;
};

function buildWeeklyInactiveReminderEmail(data: InactiveUserData): {
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

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#d946ef 100%);padding:24px 32px">
            <span style="color:#fff;font-size:18px;font-weight:700">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#d4d4d8">
            <p style="margin:0 0 20px;font-size:18px;color:#fff;font-weight:600">${greeting},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a1a1aa">
              Llevas <strong style="color:#fff">${daysText}</strong> sin pasar por aqui.
            </p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#a1a1aa">
              ${contextLine}
            </p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a1a1aa">
              ${nudgeLine}
            </p>
            <div style="text-align:center">
              <a href="${APP_URL}/app" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
                Volver a mi espacio
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272a">
            <p style="margin:0;font-size:11px;color:#52525b;text-align:center">
              No sustituye terapia profesional. <a href="${APP_URL}/settings" style="color:#71717a">Dejar de recibir estos emails</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

// GET /api/cron/weekly-inactive-reminder?secret=CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifConfig = await getNotificationConfig();
  if (!notifConfig.cronWeeklyInactiveReminder) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled_in_config" });
  }

  const prisma = getPrismaClient();
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

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      if (isSyntheticEmail(user.email)) {
        skipped++;
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
        const ok = await sendUserEmail({ to: user.email, ...email });
        if (ok) sent++;
        else errors++;
        await new Promise((r) => setTimeout(r, 200)); // throttle: 5 emails/sec max
      } catch (err) {
        logError("CRON", err, { userId: user.id, action: "weekly_inactive_reminder" });
        errors++;
      }
    }

    logInfo("CRON", "weekly_inactive_reminder_done", { candidates: users.length, sent, skipped, errors });
    return NextResponse.json({ ok: true, candidates: users.length, sent, skipped, errors });
  } catch (error) {
    logError("CRON", error, { action: "weekly_inactive_reminder_failed" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: weekly-inactive-reminder", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
