import { getPrismaClient } from "@/db/prisma";
import { buildSyntheticEmail } from "@/services/user";
import {
  ACTIVATION_RULE,
  markFirstMessageIfNull,
  tryMarkActivated,
} from "@/services/activation";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

export type TelegramUser = {
  id: string;
  telegramId: string | null;
  consentGiven: boolean;
  consentAt: Date | null;
  source: string | null;
};

export async function findTelegramUser(telegramChatId: number): Promise<TelegramUser | null> {
  const prisma = getPrismaClient();
  const userId = `tg_${telegramChatId}`;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, telegramId: true, consentGiven: true, consentAt: true, source: true },
  });
  return user;
}

export async function createTelegramUserWithConsent(telegramChatId: number): Promise<TelegramUser> {
  const prisma = getPrismaClient();
  const userId = `tg_${telegramChatId}`;
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: buildSyntheticEmail(userId),
      telegramId: String(telegramChatId),
      consentGiven: true,
      consentAt: now,
      source: "telegram",
      lastSeen: now,
    },
    update: {
      telegramId: String(telegramChatId),
      consentGiven: true,
      consentAt: now,
      source: "telegram",
      lastSeen: now,
    },
    select: { id: true, telegramId: true, consentGiven: true, consentAt: true, source: true },
  });

  logInfo("TELEGRAM", "user_created_with_consent", { userId, telegramChatId });
  return user;
}

export async function touchTelegramUser(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date(), messageCount: { increment: 1 } },
      select: { messageCount: true, firstMessageSentAt: true, activatedAt: true },
    });
    if (!updated.firstMessageSentAt) {
      void markFirstMessageIfNull(userId);
    }
    if (!updated.activatedAt && updated.messageCount >= ACTIVATION_RULE.minUserMessages) {
      void tryMarkActivated(userId);
    }
  } catch {
    // Fallback: update only lastSeen if messageCount column is unavailable
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() },
      });
    } catch (err: unknown) {
      logError("TELEGRAM", err, { area: "touchTelegramUser", userId });
    }
  }
}

export async function deactivateTelegramUser(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
  logInfo("TELEGRAM", "user_deactivated", { userId });
}

export type PendingActionSummary = {
  goalTitle: string;
  actions: string[];
};

export async function getPendingActions(userId: string): Promise<PendingActionSummary[]> {
  const prisma = getPrismaClient();
  const goals = await prisma.goal.findMany({
    where: { userId, status: "active" },
    select: {
      title: true,
      actions: {
        where: { completed: false },
        orderBy: { createdAt: "asc" },
        take: 3,
        select: { description: true },
      },
    },
  });
  return goals
    .filter((g) => g.actions.length > 0)
    .map((g) => ({ goalTitle: g.title, actions: g.actions.map((a) => a.description) }));
}

export async function getOrCreateTelegramConversation(userId: string): Promise<string> {
  const prisma = getPrismaClient();
  const existing = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const conv = await prisma.conversation.create({
    data: { userId, title: "Telegram" },
    select: { id: true },
  });
  return conv.id;
}

export async function logTelegramCrisis(
  userId: string,
  message: string,
  response: string
): Promise<void> {
  const prisma = getPrismaClient();
  try {
    await prisma.crisisEvent.create({
      data: {
        userId,
        level: "high",
        message: message.slice(0, 1000),
        response: response.slice(0, 1000),
      },
    });
    logInfo("TELEGRAM", "crisis_event_logged", { userId });
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "logTelegramCrisis", userId });
  }
}

export async function deleteTelegramUserData(telegramChatId: number): Promise<void> {
  const prisma = getPrismaClient();
  const userId = `tg_${telegramChatId}`;
  try {
    await prisma.user.delete({ where: { id: userId } });
    logInfo("TELEGRAM", "user_data_deleted", { userId, telegramChatId });
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "deleteTelegramUserData", userId });
    throw error;
  }
}

const CRISIS_STATES = new Set(["ansiedad", "bloqueo", "riesgo"]);

export function isCrisisState(state: string): boolean {
  return CRISIS_STATES.has(state.toLowerCase());
}

// ─── Notification helpers ─────────────────────────────────────────────────────
// Fire-and-forget: never await these from request handlers.

const TELEGRAM_NOTIFY_BASE = "https://api.telegram.org";

export type TelegramParseMode = "Markdown" | "HTML";

/** Sends a Telegram message. Fire-and-forget — errors are swallowed. */
export function sendTelegramNotification(
  chatId: string | number,
  text: string,
  parseMode: TelegramParseMode = "Markdown"
): void {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !chatId) return;

  void fetchWithTimeout(
    `${TELEGRAM_NOTIFY_BASE}/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    },
    5_000
  ).catch(() => {});
}

/**
 * Sends a Telegram message and awaits the result.
 * Returns true if the message was delivered, false otherwise.
 */
export async function sendTelegramMessageAsync(
  chatId: string | number,
  text: string,
  parseMode: string = "Markdown"
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !chatId) return false;

  try {
    const res = await fetchWithTimeout(
      `${TELEGRAM_NOTIFY_BASE}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
      },
      5_000
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send a document (file) to the admin Telegram chat. Used for backups.
 *
 * Telegram Bot API caps uploads at 50 MB via sendDocument. We refuse anything
 * over TELEGRAM_DOC_MAX_BYTES (49 MB by default — 1 MB margin for the
 * multipart envelope) before hitting the network, returning a specific
 * `size_exceeds_limit` error so callers can route the dump elsewhere.
 */
export const TELEGRAM_DOC_MAX_BYTES = 49 * 1024 * 1024;

export type SendAdminDocumentResult =
  | { ok: true }
  | { ok: false; error: string; reason?: "size_exceeds_limit"; sizeBytes?: number; limitBytes?: number };

export async function sendAdminDocument(
  buffer: Buffer | Uint8Array,
  filename: string,
  caption?: string,
): Promise<SendAdminDocumentResult> {
  const sizeBytes = buffer.length;
  if (sizeBytes > TELEGRAM_DOC_MAX_BYTES) {
    const error = `Document ${filename} is ${sizeBytes} bytes, over the ${TELEGRAM_DOC_MAX_BYTES} byte Telegram limit`;
    logError("TELEGRAM", new Error(error), {
      stage: "sendAdminDocument_size_check",
      filename,
      sizeBytes,
      limitBytes: TELEGRAM_DOC_MAX_BYTES,
    });
    return {
      ok: false,
      error,
      reason: "size_exceeds_limit",
      sizeBytes,
      limitBytes: TELEGRAM_DOC_MAX_BYTES,
    };
  }

  const adminChatId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!adminChatId) {
    logError("TELEGRAM", new Error("ADMIN_TELEGRAM_ID_missing"), { stage: "sendAdminDocument" });
    return { ok: false, error: "ADMIN_TELEGRAM_ID not set" };
  }

  const adminToken = process.env.TELEGRAM_BOT_TOKEN_ADMIN?.trim();
  const token = adminToken || process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    logError("TELEGRAM", new Error("TELEGRAM_BOT_TOKEN_missing"), { stage: "sendAdminDocument" });
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };
  }

  const form = new FormData();
  form.append("chat_id", adminChatId);
  if (caption) form.append("caption", caption);
  form.append(
    "document",
    new Blob([new Uint8Array(buffer)], { type: "application/gzip" }),
    filename,
  );

  try {
    const res = await fetch(`${TELEGRAM_NOTIFY_BASE}/bot${token}/sendDocument`, {
      method: "POST",
      body: form,
    });
    if (res.ok) return { ok: true };
    const bodyText = await res.text().catch(() => "");
    const error = `Telegram HTTP ${res.status}: ${bodyText.slice(0, 300)}`;
    logError("TELEGRAM", new Error(error), {
      stage: "sendAdminDocument",
      tokenSource: adminToken ? "admin" : "main",
      chatIdLength: adminChatId.length,
    });
    return { ok: false, error };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logError("TELEGRAM", err, { stage: "sendAdminDocument_fetch_threw" });
    return { ok: false, error };
  }
}

/** Shortcut: send a message to the admin chat. */
export function notifyAdmin(text: string, parseMode: TelegramParseMode = "Markdown"): void {
  const adminChatId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!adminChatId) {
    logWarn("TELEGRAM", "notifyAdmin_skipped_no_chat_id", {
      reason: "ADMIN_TELEGRAM_ID env var not configured",
    });
    return;
  }

  // Use dedicated admin bot if configured, otherwise fall back to main bot
  const adminToken = process.env.TELEGRAM_BOT_TOKEN_ADMIN?.trim();
  const token = adminToken || process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    logWarn("TELEGRAM", "notifyAdmin_skipped_no_token", {
      reason: "Neither TELEGRAM_BOT_TOKEN_ADMIN nor TELEGRAM_BOT_TOKEN configured",
    });
    return;
  }

  void fetchWithTimeout(
    `${TELEGRAM_NOTIFY_BASE}/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: parseMode }),
    },
    5_000
  ).catch(() => {});
}

// ─── Admin alert builder ──────────────────────────────────────────────────────

export type RequestSnapshot = {
  device?: string;        // "📱 iOS 17.2 · Safari 17"
  language?: string | null;     // "es-ES"
  referer?: string | null;      // "google.com" o "tresmilmillonesdelatidos.es/"
  country?: string | null;      // "ES"
  city?: string | null;         // "Madrid"
  ip?: string;            // "81.45.x.x" (enmascarada)
};

type NewUserAlert      = { tipo: "new_user";        userId: string; ctx?: RequestSnapshot };
type EmailAlert        = { tipo: "email_captured";  userId: string; email: string; ctx?: RequestSnapshot };
type NameAlert         = { tipo: "name_captured";   userId: string; name: string; ctx?: RequestSnapshot };
type FirstMessageAlert = { tipo: "first_message";   userId: string; preview: string; ctx?: RequestSnapshot };
type StateChangeAlert  = { tipo: "state_change";    userId: string; actionType: string; previousState: string; newState: string };
type CrisisAlert       = { tipo: "crisis";          userId: string; crisisLevel: string; lastMessage?: string };
type StreakAlert        = { tipo: "streak_milestone"; userId: string; streakDays: number };
type PaymentAlert      = { tipo: "payment";         userId: string; email: string; plan: string; status: string; amount: string };
type CancellationAlert = { tipo: "cancellation";    userId: string; email: string; subscriptionId: string };
type TeamLetterAlert   = { tipo: "team_letter_request"; userId: string; email: string; dominantPattern?: string | null; lastMessage?: string };

export type AdminAlertInput =
  | NewUserAlert
  | EmailAlert
  | NameAlert
  | FirstMessageAlert
  | StateChangeAlert
  | CrisisAlert
  | StreakAlert
  | PaymentAlert
  | CancellationAlert
  | TeamLetterAlert;

// Human-readable labels for explore action types
const ACTION_LABELS: Record<string, string> = {
  name_block:     "Nombrar el bloqueo",
  next_step:      "Definir siguiente paso",
  close_pending:  "Cerrar pendiente",
  order_thoughts: "Ordenar pensamientos",
};

function userVia(userId: string): string {
  return userId.startsWith("tg_") ? "_Vía: Telegram_" : "_Vía: App web_";
}

function renderCtx(ctx?: RequestSnapshot): string {
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.device) lines.push(ctx.device);
  const place = [ctx.city, ctx.country].filter(Boolean).join(", ");
  if (place) lines.push(`📍 ${place}`);
  if (ctx.ip) lines.push(`🌐 IP: \`${ctx.ip}\``);
  if (ctx.language) lines.push(`🗣 ${ctx.language}`);
  if (ctx.referer) lines.push(`🔗 ${ctx.referer}`);
  return lines.length ? "\n" + lines.join("\n") : "";
}

/**
 * Builds a Markdown-formatted admin notification with visual color coding.
 *
 * Color system (emoji blocks as visual bars):
 *   🔴 ROJO    = Crisis, peligro — acción inmediata
 *   🟠 NARANJA = Cancelación, riesgo — atención pronto
 *   🟡 AMARILLO = Cambio de estado — seguimiento
 *   🟢 VERDE   = Nuevo usuario, email, racha — buenas noticias
 *   🟣 MORADO  = Pago, suscripción — dinero
 */
export function buildAdminAlert(input: AdminAlertInput): string {
  switch (input.tipo) {
    case "new_user":
      return (
        `🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢\n` +
        `*NUEVO USUARIO*\n` +
        `🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢\n\n` +
        `👤 ID: \`${input.userId}\`\n` +
        `${userVia(input.userId)}\n` +
        `🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}` +
        renderCtx(input.ctx)
      );

    case "email_captured":
      return (
        `🟢🟢🟢 EMAIL CAPTURADO 🟢🟢🟢\n\n` +
        `👤 ID: \`${input.userId}\`\n` +
        `📧 *${input.email}*\n` +
        `${userVia(input.userId)}` +
        renderCtx(input.ctx)
      );

    case "name_captured":
      return (
        `🟢🟢🟢 NOMBRE CAPTURADO 🟢🟢🟢\n\n` +
        `👤 ID: \`${input.userId}\`\n` +
        `✏️ *${input.name}*\n` +
        `${userVia(input.userId)}` +
        renderCtx(input.ctx)
      );

    case "first_message":
      return (
        `🟢🟢🟢 PRIMER MENSAJE 🟢🟢🟢\n\n` +
        `👤 ID: \`${input.userId}\`\n` +
        `💬 _${input.preview}_\n` +
        `${userVia(input.userId)}\n` +
        `🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}` +
        renderCtx(input.ctx)
      );

    case "state_change": {
      const actionLabel = ACTION_LABELS[input.actionType] ?? input.actionType;
      const isPositive = input.newState === "claridad";
      const isDanger = input.newState === "bloqueo" || input.newState === "ansiedad";
      const bar = isDanger ? "🟡🟡🟡" : isPositive ? "🟢🟢🟢" : "🟡🟡🟡";
      return (
        `${bar} CAMBIO EMOCIONAL ${bar}\n\n` +
        `👤 \`${input.userId}\`\n` +
        `📊 *${input.previousState}* → *${input.newState}*\n` +
        `🎯 Acción: ${actionLabel}\n` +
        `${userVia(input.userId)}`
      );
    }

    case "crisis":
      return (
        `🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴\n` +
        `⚠️ *CRISIS DETECTADA* ⚠️\n` +
        `🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴\n\n` +
        `👤 Usuario: \`${input.userId}\`\n` +
        `💥 Nivel: *${input.crisisLevel.toUpperCase()}*\n` +
        (input.lastMessage ? `💬 _"${input.lastMessage.slice(0, 120)}"_\n` : "") +
        `\n${userVia(input.userId)}\n` +
        `🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`
      );

    case "streak_milestone": {
      const isBig = input.streakDays >= 30;
      const bar = isBig ? "🟢🟢🟢🟢🟢" : "🟢🟢🟢";
      return (
        `${bar} RACHA ${bar}\n\n` +
        `🔥 *${input.streakDays} días consecutivos*\n` +
        `👤 \`${input.userId}\`\n` +
        `${isBig ? "🏆 _Racha épica — este usuario va en serio_" : "_Buen ritmo_"}`
      );
    }

    case "payment": {
      const isTrialing = input.status === "trialing";
      return (
        `🟣🟣🟣🟣🟣🟣🟣🟣🟣🟣\n` +
        `💰 *${isTrialing ? "PRUEBA GRATUITA" : "PAGO CONFIRMADO"}*\n` +
        `🟣🟣🟣🟣🟣🟣🟣🟣🟣🟣\n\n` +
        `📧 *${input.email}*\n` +
        `📦 Plan: *${input.plan}* — ${input.amount}\n` +
        `👤 \`${input.userId}\`\n` +
        `${isTrialing ? "⏳ _7 días de prueba_" : "✅ _Cobro realizado_"}\n` +
        `🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`
      );
    }

    case "cancellation":
      return (
        `🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠\n` +
        `❌ *CANCELACIÓN*\n` +
        `🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠\n\n` +
        `📧 *${input.email}*\n` +
        `👤 \`${input.userId}\`\n` +
        `🔑 Sub: \`${input.subscriptionId}\`\n` +
        `🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`
      );

    case "team_letter_request":
      return (
        `💌💌💌💌💌💌💌💌💌💌\n` +
        `*CARTA DEL EQUIPO SOLICITADA*\n` +
        `💌💌💌💌💌💌💌💌💌💌\n\n` +
        `📧 *${input.email}*\n` +
        `👤 \`${input.userId}\`\n` +
        (input.dominantPattern ? `🧩 Patrón: *${input.dominantPattern}*\n` : "") +
        (input.lastMessage ? `💬 _"${input.lastMessage.slice(0, 140)}"_\n` : "") +
        `${userVia(input.userId)}\n` +
        `🕐 ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}\n` +
        `\n_Responde desde /admin/team-letters_`
      );
  }
}
