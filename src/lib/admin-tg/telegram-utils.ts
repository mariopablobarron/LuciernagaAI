import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { logError } from "@/lib/logger";

const TELEGRAM_API = "https://api.telegram.org";

export type InlineButton = { text: string; callback_data: string };

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export async function sendTelegramWithButtons(
  chatId: number | string,
  text: string,
  buttons: InlineButton[][],
  opts: { parse_mode?: "Markdown" | "MarkdownV2" | "HTML" } = {}
): Promise<{ messageId?: number; ok: boolean }> {
  const t = token();
  if (!t) return { ok: false };

  try {
    const res = await fetchWithTimeout(`${TELEGRAM_API}/bot${t}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: opts.parse_mode ?? "Markdown",
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    if (!res.ok) {
      logError("TELEGRAM_UTILS", new Error(`sendTelegramWithButtons HTTP ${res.status}`), {
        body: (await res.text().catch(() => "")).slice(0, 200),
      });
      return { ok: false };
    }
    const data = (await res.json()) as { result?: { message_id?: number } };
    return { messageId: data.result?.message_id, ok: true };
  } catch (error) {
    logError("TELEGRAM_UTILS", error, { area: "sendTelegramWithButtons" });
    return { ok: false };
  }
}

export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  opts: { parse_mode?: "Markdown" | "MarkdownV2" | "HTML"; buttons?: InlineButton[][] } = {}
): Promise<boolean> {
  const t = token();
  if (!t) return false;

  try {
    const res = await fetchWithTimeout(`${TELEGRAM_API}/bot${t}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: opts.parse_mode ?? "Markdown",
        ...(opts.buttons ? { reply_markup: { inline_keyboard: opts.buttons } } : {}),
      }),
    });
    return res.ok;
  } catch (error) {
    logError("TELEGRAM_UTILS", error, { area: "editTelegramMessage" });
    return false;
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<void> {
  const t = token();
  if (!t) return;

  try {
    await fetchWithTimeout(`${TELEGRAM_API}/bot${t}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
        show_alert: showAlert,
      }),
    });
  } catch (error) {
    logError("TELEGRAM_UTILS", error, { area: "answerCallbackQuery" });
  }
}
