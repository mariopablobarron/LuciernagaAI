import { getPrismaClient } from "@/db/prisma";
import { buildSyntheticEmail } from "@/services/user";
import { logError, logInfo } from "@/lib/logger";

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
  await prisma.user.update({
    where: { id: userId },
    data: { lastSeen: new Date() },
  });
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
