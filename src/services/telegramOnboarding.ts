/**
 * Telegram onboarding sequences for Tres Mil Millones de Latidos.
 *
 * - sendWelcomeSequence: fires the day-1 message immediately and queues day 3 & 7.
 * - scheduleFollowUp: persists a FutureMessage so the cron job delivers it on the right day.
 *
 * All Telegram sends are fire-and-forget via sendTelegramNotification.
 */

import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendTelegramNotification } from "@/services/telegram";

// ─── Message copy ─────────────────────────────────────────────────────────────

const WELCOME_DAY1 = `🌟 *¡Bienvenido/a a Tres Mil Millones de Latidos!*

Soy tu mentor personal. Estoy aquí para ayudarte a pasar de darle vueltas… a actuar.

No te pido que lo tengas todo claro. Solo necesito saber:

👉 *¿Qué estás evitando ahora mismo?*

Escríbelo sin filtros. Es el primer paso.`;

const FOLLOW_UP_DAY3 = `🔦 *¿Cómo va todo?*

Han pasado 3 días desde que llegaste.

A veces el primer obstáculo no es el problema en sí, sino volver a nombrarlo.

¿Qué ha cambiado desde la última vez? ¿Qué sigue igual?

Escríbeme cuando quieras.`;

const FOLLOW_UP_DAY7 = `⚡ *Una semana contigo*

Llevas 7 días aquí. Eso ya dice algo de ti.

Quiero saber:
• ¿Hubo algo pequeño que hiciste diferente esta semana?
• ¿Hay algo que sigues posponiendo?

No hace falta que sea perfecto. Solo honesto.`;

const FOLLOW_UP_TEXTS: Record<number, string> = {
  3: FOLLOW_UP_DAY3,
  7: FOLLOW_UP_DAY7,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends the day-1 welcome message immediately and queues day-3 and day-7 follow-ups.
 * Safe to call from any request handler — the Telegram send is fire-and-forget.
 */
export async function sendWelcomeSequence(
  userId: string,
  telegramId: string
): Promise<void> {
  sendTelegramNotification(telegramId, WELCOME_DAY1);
  logInfo("TELEGRAM", "welcome_sequence_sent", { userId, telegramId });

  // Queue follow-ups via FutureMessage (cron delivers them on the right day)
  await Promise.allSettled([
    scheduleFollowUp(userId, telegramId, 3),
    scheduleFollowUp(userId, telegramId, 7),
  ]);
}

/**
 * Stores a follow-up message in FutureMessage to be delivered by the cron job.
 * The cron checks `status: "pending"` and `unlockAt <= now` and sends via Telegram.
 */
export async function scheduleFollowUp(
  userId: string,
  _telegramId: string, // kept in signature for context; delivery uses User.telegramId
  days: number
): Promise<void> {
  const text = FOLLOW_UP_TEXTS[days] ?? FOLLOW_UP_TEXTS[3];
  const unlockAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const prisma = getPrismaClient();
  try {
    await prisma.futureMessage.create({
      data: {
        userId,
        title: `Seguimiento día ${days}`,
        content: text,
        unlockAt,
        status: "pending",
      },
    });
    logInfo("TELEGRAM", "follow_up_scheduled", { userId, days, unlockAt: unlockAt.toISOString() });
  } catch (error: unknown) {
    logError("TELEGRAM", error, { area: "scheduleFollowUp", userId, days });
  }
}
