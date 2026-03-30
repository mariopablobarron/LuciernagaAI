import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { generateAIResponse } from "@/services/ai";
import { saveConversationMessage } from "@/services/conversation";
import { analyzeEmotionalProfile, getEmotionalProfile } from "@/services/emotional-model";
import { detectUserState } from "@/services/state";
import {
  createTelegramUserWithConsent,
  deleteTelegramUserData,
  findTelegramUser,
  getOrCreateTelegramConversation,
  isCrisisState,
  logTelegramCrisis,
  touchTelegramUser,
} from "@/services/telegram";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";

// ---- Telegram types ----

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

// ---- Constants ----

const TELEGRAM_API = "https://api.telegram.org";

const CONSENT_MESSAGE = `Antes de empezar necesito tu consentimiento.

Este asistente utiliza inteligencia artificial para acompañarte en decisiones personales.

🔹 Tus datos serán tratados de forma confidencial
🔹 Puedes dejar de usarlo en cualquier momento
🔹 No sustituye ayuda profesional

Consulta la política: ${process.env.APP_BASE_URL ?? "https://luciernaga.ai"}/privacidad

Escribe ACEPTO para continuar.`;

const WELCOME_MESSAGE =
  "Gracias. Ya puedes comenzar. ¿Qué te preocupa ahora mismo?";

const DELETE_CONFIRM_MESSAGE =
  "✅ Todos tus datos han sido eliminados. Si quieres volver a usar el asistente escríbeme cuando quieras.";

const DELETE_ERROR_MESSAGE =
  "No se pudieron eliminar tus datos en este momento. Inténtalo más tarde o contacta con soporte.";

// ---- Telegram API helper ----

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
      logError("TELEGRAM", new Error(`sendMessage HTTP ${res.status}: ${body.slice(0, 200)}`), {
        chatId,
      });
    }
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "sendTelegramMessage", chatId });
  }
}

// ---- Webhook handler ----

export async function POST(req: NextRequest): Promise<NextResponse> {
  let chatId: number | undefined;

  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    // Ignore non-text updates silently
    if (!message?.text?.trim()) {
      return NextResponse.json({ ok: true });
    }

    chatId = message.chat.id;
    const text = message.text.trim();
    const userId = `tg_${chatId}`;

    logInfo("TELEGRAM", "message_received", { chatId, userId, textLength: text.length });

    // ---- Handle /borrar_datos ----
    if (text === "/borrar_datos") {
      try {
        await deleteTelegramUserData(chatId);
        await sendTelegramMessage(chatId, DELETE_CONFIRM_MESSAGE);
      } catch {
        await sendTelegramMessage(chatId, DELETE_ERROR_MESSAGE);
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Look up user ----
    let user = await findTelegramUser(chatId);

    // ---- Handle /start ----
    if (text === "/start") {
      if (!user || !user.consentGiven) {
        await sendTelegramMessage(chatId, CONSENT_MESSAGE);
      } else {
        await sendTelegramMessage(chatId, "Ya tienes una sesión activa. ¿En qué te puedo ayudar?");
      }
      return NextResponse.json({ ok: true });
    }

    // ---- Consent gate ----
    if (!user || !user.consentGiven) {
      if (text.toUpperCase() === "ACEPTO") {
        user = await createTelegramUserWithConsent(chatId);
        await sendTelegramMessage(chatId, WELCOME_MESSAGE);
        return NextResponse.json({ ok: true });
      }
      // User doesn't exist or hasn't consented
      await sendTelegramMessage(chatId, CONSENT_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    // ---- Authenticated chat flow ----
    await touchTelegramUser(userId);

    const state = detectUserState(text);
    const existingProfile = await getEmotionalProfile(userId).catch(
      () => DEFAULT_EMOTIONAL_PROFILE
    );
    const emotionalProfile = analyzeEmotionalProfile(text, []) ?? existingProfile;

    const aiResult = await generateAIResponse(text, state, emotionalProfile, {
      access: {
        userPlan: "free",
        remainingMessages: null,
        hasActiveGoal: false,
        conversionTrigger: false,
      },
    });

    logInfo("TELEGRAM", "response_generated", { chatId, userId, fallback: aiResult.fallback });

    // ---- Persist both messages ----
    try {
      const conversationId = await getOrCreateTelegramConversation(userId);
      await saveConversationMessage({
        conversationId,
        userId,
        role: "user",
        content: text,
        updateTitleFromUserMessage: false,
      });
      await saveConversationMessage({
        conversationId,
        userId,
        role: "assistant",
        content: aiResult.response,
      });
    } catch (dbError: unknown) {
      logError("TELEGRAM", dbError, { area: "message_persistence", userId });
    }

    // ---- Crisis detection ----
    if (isCrisisState(state)) {
      await logTelegramCrisis(userId, text, aiResult.response);
    }

    // ---- Send reply ----
    await sendTelegramMessage(chatId, aiResult.response);
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "webhook_handler", chatId });
    // Always return 200 so Telegram doesn't retry
  }

  return NextResponse.json({ ok: true });
}
