import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendUserEmail } from "@/lib/email";
import { baseLayout } from "@/lib/email-layout";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { isSyntheticEmail } from "@/services/user";
import { getNotificationConfig } from "@/lib/notification-config";

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
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
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
        const ok = await sendUserEmail({
          to: user.email,
          ...email,
          userId: user.id,
          template: "weekly_inactive",
        });
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
