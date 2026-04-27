import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendTelegramMessageAsync } from "@/services/telegram";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { getNotificationConfig } from "@/lib/notification-config";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/telegram-checkin?secret=xxx&period=morning|evening
 *
 * Sends daily check-in prompts to Telegram users:
 * - morning: "¿Qué vas a hacer hoy?" (run at 09:00)
 * - evening: "¿Lo hiciste?" (run at 21:00)
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const notifConfig = await getNotificationConfig();
  if (!notifConfig.cronDailyCheckin) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled_in_config" });
  }

  const period = req.nextUrl.searchParams.get("period") ?? "morning";
  if (period !== "morning" && period !== "evening") {
    return NextResponse.json({ error: "Invalid period. Use morning or evening." }, { status: 400 });
  }

  const prisma = getPrismaClient();

  try {
    // Find Telegram users with reminders enabled and active in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: {
        telegramId: { not: null },
        isActive: true,
        consentGiven: true,
        lastSeen: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        telegramId: true,
        name: true,
        goals: {
          where: { status: "active" as const },
          select: {
            actions: {
              where: { completed: false },
              select: { description: true },
              take: 1,
            },
          },
          take: 1,
        },
        streak: { select: { currentDays: true } },
        preferences: { select: { reminderEnabled: true } },
      },
      take: 500,
    });

    // Filter: only users with reminders enabled (default true if no preferences)
    const eligible = users.filter(
      (u) => u.telegramId && (u.preferences?.reminderEnabled ?? true),
    );

    let sent = 0;
    let errors = 0;

    for (const user of eligible) {
      const pendingAction = user.goals[0]?.actions[0]?.description;
      const streak = user.streak?.currentDays ?? 0;
      const firstName = user.name?.split(" ")[0] ?? "";

      let message: string;

      if (period === "morning") {
        if (pendingAction) {
          message =
            `☀️ *Buenos días${firstName ? `, ${firstName}` : ""}*\n\n` +
            `Tienes algo pendiente:\n` +
            `📌 _${pendingAction}_\n\n` +
            `¿Hoy es el día? Escribe lo que vas a hacer.`;
        } else {
          message =
            `☀️ *Buenos días${firstName ? `, ${firstName}` : ""}*\n\n` +
            `¿Que vas a hacer hoy que valga la pena?\n\n` +
            `Escribe una accion concreta.`;
        }
        if (streak >= 3) {
          message += `\n\n🔥 Racha: ${streak} dias`;
        }
      } else {
        // evening
        if (pendingAction) {
          message =
            `🌙 *Cierre del día${firstName ? `, ${firstName}` : ""}*\n\n` +
            `Esta mañana tenias pendiente:\n` +
            `📌 _${pendingAction}_\n\n` +
            `¿Lo hiciste? Cuentame como fue.`;
        } else {
          message =
            `🌙 *Cierre del día${firstName ? `, ${firstName}` : ""}*\n\n` +
            `¿Que has conseguido hoy? Aunque sea pequeno, anotalo.`;
        }
      }

      try {
        const ok = await sendTelegramMessageAsync(user.telegramId!, message, "Markdown");
        if (ok) sent++;
        else errors++;
      } catch {
        errors++;
      }
    }

    logInfo("CRON", `telegram_checkin_${period}`, {
      eligible: eligible.length,
      sent,
      errors,
    });

    return NextResponse.json({
      ok: true,
      period,
      eligible: eligible.length,
      sent,
      errors,
    });
  } catch (error) {
    const msg = error instanceof Error ? `${error.message}\n${error.stack?.slice(0, 500)}` : "Error desconocido";
    logError("CRON", error, { action: `telegram_checkin_${period}` });
    sendAutomatedAlert({ type: "critical", title: `Cron falló: telegram-checkin (${period})`, message: msg }).catch(() => {});
    return NextResponse.json({ error: "CRON_FAILED", message: msg }, { status: 500 });
  }
}
