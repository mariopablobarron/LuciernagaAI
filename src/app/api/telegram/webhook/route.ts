import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { generateAIResponse } from "@/services/ai";
import { ensureUserSession } from "@/services/conversation";
import { analyzeEmotionalProfile, getEmotionalProfile } from "@/services/emotional-model";
import { detectUserState } from "@/services/state";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";

// Telegram Update shape (minimal)
interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

const TELEGRAM_API = "https://api.telegram.org";

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logError("TELEGRAM", new Error("TELEGRAM_BOT_TOKEN not set"), { chatId });
    return;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logError("TELEGRAM", new Error(`sendMessage HTTP ${res.status}: ${body.slice(0, 200)}`), { chatId });
    }
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "sendTelegramMessage", chatId });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let chatId: number | undefined;

  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    // Ignore non-text updates
    if (!message?.text?.trim()) {
      return NextResponse.json({ ok: true });
    }

    chatId = message.chat.id;
    const text = message.text.trim();
    const userId = `tg_${chatId}`;

    logInfo("TELEGRAM", "message_received", {
      chatId,
      userId,
      messageLength: text.length,
    });

    // Bootstrap user session (idempotent)
    await ensureUserSession(userId);

    // Detect emotional state and profile from message
    const state = detectUserState(text);
    const existingProfile = await getEmotionalProfile(userId).catch(() => DEFAULT_EMOTIONAL_PROFILE);
    const emotionalProfile = analyzeEmotionalProfile(text, []);

    const aiResult = await generateAIResponse(text, state, emotionalProfile ?? existingProfile, {
      access: {
        userPlan: "free",
        remainingMessages: null,
        hasActiveGoal: false,
        conversionTrigger: false,
      },
    });

    logInfo("TELEGRAM", "response_generated", {
      chatId,
      userId,
      fallback: aiResult.fallback,
    });

    await sendTelegramMessage(chatId, aiResult.response);
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "webhook_handler", chatId });
    // Always return 200 so Telegram doesn't retry
  }

  return NextResponse.json({ ok: true });
}
