import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendTelegramNotification } from "@/services/telegram";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";

// GET /api/cron/action-reminders?secret=CRON_SECRET
// Run once per hour. Sends at most 1 Telegram reminder per user per day,
// respecting the user's preferred reminderTime ("HH:MM"). Default: 09:00.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Load pending reminders with user preferences
    const due = await prisma.actionReminder.findMany({
      where: { sent: false, remindAt: { lte: now } },
      take: 100,
      include: {
        user: {
          select: {
            telegramId: true,
            preferences: { select: { reminderTime: true } },
          },
        },
      },
    });

    let sent = 0;
    let skipped = 0;
    const sentUserIds = new Set<string>();

    for (const reminder of due) {
      const telegramId = reminder.user.telegramId;
      if (!telegramId) continue;

      // Enforce 1 reminder per user per day
      if (sentUserIds.has(reminder.userId)) {
        skipped++;
        continue;
      }

      // Respect preferred time window (±30 min). Default 09:00 UTC.
      const prefTime = reminder.user.preferences?.reminderTime ?? "09:00";
      const [prefHour, prefMin] = prefTime.split(":").map(Number);
      const preferredMinutesOfDay = prefHour * 60 + prefMin;
      const currentMinutesOfDay = currentHour * 60 + currentMinute;
      const diff = Math.abs(currentMinutesOfDay - preferredMinutesOfDay);

      if (diff > 30) {
        // Outside the 30-min window around the user's preferred time — wait
        skipped++;
        continue;
      }

      const text =
        `⏰ *Recordatorio diario*\n\n` +
        `Tienes una acción pendiente:\n\n` +
        `_${reminder.actionText}_\n\n` +
        `¿Ya lo hiciste? Abre la app y cuéntame.`;

      sendTelegramNotification(telegramId, text);
      sentUserIds.add(reminder.userId);
      sent++;

      await prisma.actionReminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: now },
      });
    }

    logInfo("CRON", "action_reminders_sent", { total: due.length, sent, skipped });
    return NextResponse.json({ ok: true, processed: due.length, sent, skipped });
  } catch (error) {
    logError("CRON", error, { action: "action_reminders_failed" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: action-reminders", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
