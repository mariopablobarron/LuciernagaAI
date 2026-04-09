import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { buildReminderEmail, sendUserEmail } from "@/lib/email";
import { isSyntheticEmail } from "@/services/user";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

const TELEGRAM_API = "https://api.telegram.org";
const REMINDER_WINDOW_HOURS = 24;
const CUTOFF_MS = REMINDER_WINDOW_HOURS * 60 * 60 * 1000;

// ---- Shared types ----

type BaseReminderUser = {
  id: string;
  pendingAction: string;
  lastSeen: Date;
};

type TelegramReminderUser = BaseReminderUser & {
  channel: "telegram";
  telegramId: string;
};

type EmailReminderUser = BaseReminderUser & {
  channel: "email";
  email: string;
};

export type ReminderUser = TelegramReminderUser | EmailReminderUser;

// ---- Queries ----

export async function getUsersNeedingReminder(): Promise<ReminderUser[]> {
  const prisma = getPrismaClient();
  const cutoff = new Date(Date.now() - CUTOFF_MS);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      AND: [
        {
          // lastMessageAt is precise; fall back to lastSeen for pre-migration users
          OR: [
            { lastMessageAt: { lt: cutoff } },
            { lastMessageAt: null, lastSeen: { lt: cutoff } },
          ],
        },
        {
          OR: [
            { source: "telegram", consentGiven: true, telegramId: { not: null } },
            { source: { not: "telegram" } },
          ],
        },
      ],
      goals: {
        some: {
          status: "active",
          actions: { some: { completed: false } },
        },
      },
    },
    select: {
      id: true,
      email: true,
      source: true,
      telegramId: true,
      lastSeen: true,
      goals: {
        where: { status: "active" },
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: {
          actions: {
            where: { completed: false },
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { description: true },
          },
        },
      },
    },
  });

  const result: ReminderUser[] = [];

  for (const user of users) {
    const pendingAction = user.goals[0]?.actions[0]?.description;
    if (!pendingAction) continue;

    if (user.source === "telegram" && user.telegramId) {
      result.push({
        channel: "telegram",
        id: user.id,
        telegramId: user.telegramId,
        lastSeen: user.lastSeen,
        pendingAction,
      });
      continue;
    }

    // Web user: only if they have a real (non-synthetic) email
    if (!isSyntheticEmail(user.email)) {
      result.push({
        channel: "email",
        id: user.id,
        email: user.email,
        lastSeen: user.lastSeen,
        pendingAction,
      });
    }
  }

  return result;
}

// ---- Senders ----

export async function sendTelegramReminder(user: TelegramReminderUser): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logError("REMINDERS", new Error("TELEGRAM_BOT_TOKEN not set"), { userId: user.id });
    return;
  }

  const message =
    `Han pasado ${REMINDER_WINDOW_HOURS}h desde que hablaste.\n\n` +
    `Dijiste que harías esto:\n${user.pendingAction}\n\n` +
    `¿Qué está pasando?`;

  const chatId = parseInt(user.telegramId, 10);
  const res = await fetchWithTimeout(
    `${TELEGRAM_API}/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    },
    5_000
  );

  if (res.ok) {
    logInfo("REMINDERS", "telegram_reminder_sent", { userId: user.id, chatId });
  } else {
    const body = await res.text().catch(() => "");
    logError(
      "REMINDERS",
      new Error(`sendMessage HTTP ${res.status}: ${body.slice(0, 200)}`),
      { userId: user.id }
    );
  }
}

export async function sendEmailReminder(user: EmailReminderUser): Promise<void> {
  const appUrl = process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es";
  const template = buildReminderEmail({ pendingAction: user.pendingAction, appUrl });

  const sent = await sendUserEmail({ to: user.email, ...template });

  if (sent) {
    logInfo("REMINDERS", "email_reminder_sent", { userId: user.id, email: user.email });
  } else {
    logError("REMINDERS", new Error("email_reminder_failed"), { userId: user.id });
  }
}

// ---- Job ----

export async function runReminderJob(): Promise<{
  telegram: { sent: number; errors: number };
  email: { sent: number; errors: number };
}> {
  const stats = {
    telegram: { sent: 0, errors: 0 },
    email: { sent: 0, errors: 0 },
  };

  try {
    const users = await getUsersNeedingReminder();
    logInfo("REMINDERS", "job_started", {
      candidates: users.length,
      telegram: users.filter((u) => u.channel === "telegram").length,
      email: users.filter((u) => u.channel === "email").length,
    });

    for (const user of users) {
      try {
        if (user.channel === "telegram") {
          await sendTelegramReminder(user);
          stats.telegram.sent++;
        } else {
          await sendEmailReminder(user);
          stats.email.sent++;
        }
      } catch (err: unknown) {
        logError("REMINDERS", err, { userId: user.id, channel: user.channel });
        if (user.channel === "telegram") {
          stats.telegram.errors++;
        } else {
          stats.email.errors++;
        }
      }
    }

    logInfo("REMINDERS", "job_completed", stats);
  } catch (error: unknown) {
    logError("REMINDERS", error, { area: "runReminderJob" });
    stats.telegram.errors++;
  }

  return stats;
}
