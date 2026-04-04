import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { sendTelegramNotification } from "@/services/telegram";
import { logError, logInfo } from "@/lib/logger";

// GET /api/cron/action-reminders?secret=CRON_SECRET
// Run every 5–15 minutes. Sends pending Telegram reminders.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const prisma = getPrismaClient();
    const now = new Date();

    const due = await prisma.actionReminder.findMany({
      where: { sent: false, remindAt: { lte: now } },
      take: 50,
      include: { user: { select: { telegramId: true } } },
    });

    let sent = 0;
    for (const reminder of due) {
      const telegramId = reminder.user.telegramId;
      if (telegramId) {
        const text =
          `⏰ *Recordatorio de acción*\n\n` +
          `Hace un rato te comprometiste con esto:\n\n` +
          `_${reminder.actionText}_\n\n` +
          `¿Ya lo hiciste? Abre la app y cuéntame cómo te fue.`;

        sendTelegramNotification(telegramId, text);
        sent++;
      }

      await prisma.actionReminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: now },
      });
    }

    logInfo("CRON", "action_reminders_sent", { total: due.length, sent });
    return NextResponse.json({ ok: true, processed: due.length, sent });
  } catch (error) {
    logError("CRON", error, { action: "action_reminders_failed" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
