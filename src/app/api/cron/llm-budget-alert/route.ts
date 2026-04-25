import { NextResponse, type NextRequest } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { getPrismaClient } from "@/db/prisma";
import { calcLlmBudget, buildBudgetTelegramMessage } from "@/lib/admin-tg/llm-budget";

export const dynamic = "force-dynamic";

const ALERT_TAG = "LLM_BUDGET_ALERTED";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

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
    const budget = await calcLlmBudget();

    if (!budget.alertReason) {
      return NextResponse.json({ ok: true, sent: false, reason: "below_threshold", budget });
    }

    const prisma = getPrismaClient();
    const dedupeKey = `${todayKey()}:${budget.alertReason}`;

    // Dedup diario por nivel: si ya se envió hoy una alerta del mismo nivel, no re-enviamos
    const already = await prisma.systemLog.findFirst({
      where: { tag: ALERT_TAG, message: dedupeKey },
      select: { id: true },
    });
    if (already) {
      return NextResponse.json({ ok: true, sent: false, reason: "deduped", budget });
    }

    const message = buildBudgetTelegramMessage(budget);
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    });

    if (!tgRes.ok) {
      const body = await tgRes.text();
      logError("LLM_BUDGET_ALERT", new Error(`Telegram HTTP ${tgRes.status}`), { body: body.slice(0, 200) });
      return NextResponse.json({ ok: false, telegram: tgRes.status }, { status: 500 });
    }

    await prisma.systemLog
      .create({
        data: {
          level: budget.alertReason === "critical" ? "warn" : "info",
          tag: ALERT_TAG,
          message: dedupeKey,
          context: { ...budget },
        },
      })
      .catch(() => null);

    logInfo("LLM_BUDGET_ALERT", "sent", { level: budget.alertReason });
    return NextResponse.json({ ok: true, sent: true, budget });
  } catch (error) {
    logError("LLM_BUDGET_ALERT", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
