import { getPrismaClient } from "@/db/prisma";
import { buildSyntheticEmail } from "@/services/user";
import { logError, logInfo } from "@/lib/logger";
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
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date(), messageCount: { increment: 1 } },
    });
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

/** Shortcut: send a message to the admin chat. */
export function notifyAdmin(text: string, parseMode: TelegramParseMode = "Markdown"): void {
  const adminChatId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!adminChatId) return;
  sendTelegramNotification(adminChatId, text, parseMode);
}

// ─── Admin alert builder ──────────────────────────────────────────────────────

type NewUserAlert      = { tipo: "new_user";        userId: string };
type EmailAlert        = { tipo: "email_captured";  userId: string; email: string };
type StateChangeAlert  = { tipo: "state_change";    userId: string; actionType: string; previousState: string; newState: string };
type CrisisAlert       = { tipo: "crisis";          userId: string; crisisLevel: string; lastMessage?: string };
type StreakAlert        = { tipo: "streak_milestone"; userId: string; streakDays: number };
type PaymentAlert      = { tipo: "payment";         userId: string; email: string; plan: string; status: string; amount: string };
type CancellationAlert = { tipo: "cancellation";    userId: string; email: string; subscriptionId: string };

export type AdminAlertInput =
  | NewUserAlert
  | EmailAlert
  | StateChangeAlert
  | CrisisAlert
  | StreakAlert
  | PaymentAlert
  | CancellationAlert;

/** Builds a Markdown-formatted admin notification string. */
export function buildAdminAlert(input: AdminAlertInput): string {
  switch (input.tipo) {
    case "new_user":
      return `👤 *Nuevo usuario*\n\nID: \`${input.userId}\``;

    case "email_captured":
      return `📧 *Usuario identificado*\n\nID: \`${input.userId}\`\nEmail: ${input.email}`;

    case "state_change":
      return (
        `🧠 *Luciernaga Alerta*\n\n` +
        `👤 Usuario: \`${input.userId}\`\n` +
        `🎯 Acción: ${input.actionType}\n` +
        `💡 Estado: ${input.previousState} → *${input.newState}*`
      );

    case "crisis":
      return (
        `🚨 *Crisis detectada*\n\n` +
        `👤 Usuario: \`${input.userId}\`\n` +
        `⚡ Nivel: *${input.crisisLevel}*` +
        (input.lastMessage ? `\n💬 _${input.lastMessage.slice(0, 120)}_` : "")
      );

    case "streak_milestone":
      return `🔥 *Racha destacada*\n\nID: \`${input.userId}\`\nRacha: *${input.streakDays} días*`;

    case "payment": {
      const isTrialing = input.status === "trialing";
      const emoji = isTrialing ? "🎉" : "💰";
      const statusLabel = isTrialing ? "Prueba gratuita iniciada (7 días)" : "Pago confirmado";
      return (
        `${emoji} *${statusLabel}*\n\n` +
        `📧 Email: \`${input.email}\`\n` +
        `📦 Plan: *${input.plan}* — ${input.amount}\n` +
        `👤 ID: \`${input.userId}\``
      );
    }

    case "cancellation":
      return (
        `❌ *Suscripción cancelada*\n\n` +
        `📧 Email: \`${input.email}\`\n` +
        `👤 ID: \`${input.userId}\`\n` +
        `🔑 Sub: \`${input.subscriptionId}\``
      );
  }
}
