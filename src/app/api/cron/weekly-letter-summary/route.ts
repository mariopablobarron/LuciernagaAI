import { NextResponse, type NextRequest } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { buildWeeklyLetterSummaryMessage } from "@/lib/weekly-letter-summary";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Missing TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_ID" }, { status: 500 });
  }

  try {
    const message = await buildWeeklyLetterSummaryMessage();

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    });

    if (!tgRes.ok) {
      const tgBody = await tgRes.text();
      logError("WEEKLY_LETTER_SUMMARY", new Error(`Telegram HTTP ${tgRes.status}`), { body: tgBody.slice(0, 200) });
      return NextResponse.json({ ok: false, telegram: tgRes.status }, { status: 500 });
    }

    logInfo("WEEKLY_LETTER_SUMMARY", "sent");
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("WEEKLY_LETTER_SUMMARY", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
