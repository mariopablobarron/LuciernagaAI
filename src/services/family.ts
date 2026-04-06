/**
 * Family / trusted contact service.
 *
 * Handles:
 *  - Notifying a trusted contact on crisis detection
 *  - Notifying a trusted contact when a win is shared
 *  - Delivering support messages to the user (in-app + email)
 *  - Inactivity check (called by cron)
 */

import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendUserEmail } from "@/lib/email";
import {
  buildFamilyCrisisEmail,
  buildFamilyInactivityEmail,
  buildFamilyWinEmail,
  buildFamilyInviteEmail,
  buildSupportMessageEmail,
} from "@/lib/email";
import { sendTelegramNotification } from "@/services/telegram";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

function portalUrl(accessToken: string): string {
  return `${APP_BASE_URL}/family/${accessToken}`;
}

// ─── Notify on crisis ──────────────────────────────────────────────────────────

export async function notifyTrustedContactOnCrisis(userId: string): Promise<void> {
  const prisma = getPrismaClient();

  const contact = await prisma.trustedContact.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!contact || !contact.notifyOnCrisis) return;

  const userName = contact.user.name ?? contact.user.email ?? "Tu familiar";
  const url = portalUrl(contact.accessToken);

  // Email notification
  const emailPayload = buildFamilyCrisisEmail({
    userName,
    contactName: contact.name,
    portalUrl: url,
    appBaseUrl: APP_BASE_URL,
  });
  void sendUserEmail({ to: contact.email, ...emailPayload });

  // Telegram notification (if contact has a telegramId stored as phone field with @ prefix)
  if (contact.phone?.startsWith("@") || /^\d{6,}$/.test(contact.phone ?? "")) {
    const msg =
      `⚠️ *Alerta de Tres Mil Millones de Latidos*\n\n` +
      `${userName} puede necesitar apoyo ahora. Se ha detectado una señal de crisis.\n\n` +
      `Accede a tu portal: ${url}`;
    sendTelegramNotification(contact.phone!.replace("@", ""), msg);
  }

  await prisma.trustedContact.update({
    where: { id: contact.id },
    data: { lastNotifiedAt: new Date() },
  });

  logInfo("FAMILY", "crisis_notified_trusted_contact", { userId, contactEmail: contact.email });
}

// ─── Notify on win ─────────────────────────────────────────────────────────────

export async function notifyTrustedContactOnWin(
  userId: string,
  winNote: string,
): Promise<void> {
  const prisma = getPrismaClient();

  const contact = await prisma.trustedContact.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!contact || !contact.shareWins) return;

  const userName = contact.user.name ?? contact.user.email ?? "Tu familiar";
  const url = portalUrl(contact.accessToken);

  const emailPayload = buildFamilyWinEmail({
    userName,
    contactName: contact.name,
    winNote,
    portalUrl: url,
  });
  void sendUserEmail({ to: contact.email, ...emailPayload });

  await prisma.trustedContact.update({
    where: { id: contact.id },
    data: { lastNotifiedAt: new Date() },
  });

  logInfo("FAMILY", "win_notified_trusted_contact", { userId, contactEmail: contact.email });
}

// ─── Send family invite ────────────────────────────────────────────────────────

export async function sendFamilyInviteEmail(
  contactId: string,
): Promise<void> {
  const prisma = getPrismaClient();

  const contact = await prisma.trustedContact.findUnique({
    where: { id: contactId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!contact) return;

  const userName = contact.user.name ?? contact.user.email ?? "Tu familiar";
  const url = portalUrl(contact.accessToken);

  const emailPayload = buildFamilyInviteEmail({
    userName,
    contactName: contact.name,
    relation: contact.relation ?? "persona de confianza",
    portalUrl: url,
  });

  const sent = await sendUserEmail({ to: contact.email, ...emailPayload });

  await prisma.trustedContact.update({
    where: { id: contact.id },
    data: { inviteSentAt: sent ? new Date() : undefined },
  });

  logInfo("FAMILY", "invite_sent", { contactId, sent });
}

// ─── Deliver support message (in-app + optional email) ────────────────────────

export async function deliverSupportMessage(messageId: string): Promise<void> {
  const prisma = getPrismaClient();

  const msg = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    include: { user: { select: { email: true } } },
  });

  if (!msg || msg.deliveredAt) return;

  await prisma.supportMessage.update({
    where: { id: messageId },
    data: { deliveredAt: new Date() },
  });

  // Also send email to the user so they don't miss it
  const emailPayload = buildSupportMessageEmail({
    userEmail: msg.user.email,
    fromName: msg.fromName,
    content: msg.content,
    appUrl: `${APP_BASE_URL}/app`,
  });
  void sendUserEmail({ to: msg.user.email, ...emailPayload });

  logInfo("FAMILY", "support_message_delivered", { messageId, userId: msg.userId });
}

// ─── Inactivity check (called by cron) ────────────────────────────────────────

export interface InactivityResult {
  checked: number;
  notified: number;
}

export async function checkInactiveUsers(): Promise<InactivityResult> {
  const prisma = getPrismaClient();

  // Find all trusted contacts that want inactivity alerts
  const contacts = await prisma.trustedContact.findMany({
    where: { notifyOnInactivity: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          lastSeen: true,
          lastMessageAt: true,
        },
      },
    },
  });

  let notified = 0;

  for (const contact of contacts) {
    const user = contact.user;
    const lastActivity = user.lastMessageAt ?? user.lastSeen;
    const daysSilent = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSilent < contact.inactivityDays) continue;

    // Avoid spamming — only notify once per inactivity threshold crossing
    if (contact.lastNotifiedAt) {
      const daysSinceNotified = Math.floor(
        (Date.now() - new Date(contact.lastNotifiedAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceNotified < contact.inactivityDays) continue;
    }

    const userName = user.name ?? user.email ?? "Tu familiar";
    const url = portalUrl(contact.accessToken);

    const emailPayload = buildFamilyInactivityEmail({
      userName,
      contactName: contact.name,
      daysSilent,
      portalUrl: url,
    });

    void sendUserEmail({ to: contact.email, ...emailPayload });

    await prisma.trustedContact.update({
      where: { id: contact.id },
      data: { lastNotifiedAt: new Date() },
    });

    logInfo("FAMILY", "inactivity_notified", {
      userId: user.id,
      contactEmail: contact.email,
      daysSilent,
    });

    notified++;
  }

  return { checked: contacts.length, notified };
}

// ─── Look up family portal by token ───────────────────────────────────────────

export async function resolveFamilyPortal(accessToken: string) {
  const prisma = getPrismaClient();

  const contact = await prisma.trustedContact.findUnique({
    where: { accessToken },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          lastSeen: true,
          lastMessageAt: true,
          streak: { select: { currentDays: true, bestDays: true, status: true } },
        },
      },
    },
  });

  if (!contact) return null;

  // Record portal access
  await prisma.trustedContact.update({
    where: { id: contact.id },
    data: { lastAccessAt: new Date() },
  });

  return contact;
}

// ─── Get portal dashboard data ─────────────────────────────────────────────────

export async function getFamilyDashboardData(contact: Awaited<ReturnType<typeof resolveFamilyPortal>>) {
  if (!contact) return null;

  const prisma = getPrismaClient();
  const userId = contact.user.id;
  const result: Record<string, unknown> = {
    userName: contact.user.name ?? "Tu familiar",
    relation: contact.relation ?? "persona de confianza",
    lastSeenAt: contact.user.lastMessageAt ?? contact.user.lastSeen,
  };

  if (contact.shareProgress) {
    const [userState, activeGoal] = await Promise.all([
      prisma.userState.findUnique({
        where: { userId },
        select: {
          state: true,
          primaryEmotion: true,
          progressTrend: true,
          transformationPhase: true,
        },
      }),
      prisma.goal.findFirst({
        where: { userId, status: "active" },
        select: {
          title: true,
          actions: {
            select: { completed: true },
          },
        },
      }),
      // 30-day emotional log for mini heatmap
    ]);

    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        logDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { logDate: "asc" },
      select: { logDate: true, emotionalState: true },
    });

    result.progress = {
      state: userState?.state ?? "neutral",
      primaryEmotion: userState?.primaryEmotion ?? null,
      progressTrend: userState?.progressTrend ?? "igual",
      phase: userState?.transformationPhase ?? null,
      goal: activeGoal
        ? {
            title: activeGoal.title,
            total: activeGoal.actions.length,
            completed: activeGoal.actions.filter((a) => a.completed).length,
          }
        : null,
      emotionalLog: dailyLogs.map((l) => ({
        date: l.logDate.toISOString().slice(0, 10),
        state: l.emotionalState,
      })),
    };
  }

  if (contact.shareStreak) {
    result.streak = contact.user.streak
      ? {
          current: contact.user.streak.currentDays,
          best: contact.user.streak.bestDays,
          status: contact.user.streak.status,
        }
      : null;
  }

  if (contact.shareWins) {
    const wins = await prisma.win.findMany({
      where: { userId, sharedWithFamily: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { note: true, createdAt: true },
    });
    result.wins = wins.map((w) => ({ note: w.note, date: w.createdAt.toISOString() }));
  }

  // Unread support messages count
  const unreadCount = await prisma.supportMessage.count({
    where: { userId, deliveredAt: { not: null }, readAt: null },
  });
  result.unreadSupportMessages = unreadCount;

  return result;
}

// ─── Notify user of new ping via Telegram ─────────────────────────────────────

export async function notifyUserOfPing(userId: string, fromName: string): Promise<void> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true },
  });

  if (user?.telegramId) {
    sendTelegramNotification(
      user.telegramId,
      `💛 *${fromName}* quiere saber cómo estás.\n\nSolo es un "hola". Responde cuando puedas abriendo la app.`,
    );
  }
}

// ─── Handle error safely ───────────────────────────────────────────────────────

export function safeFamilyNotify(
  fn: () => Promise<void>,
  context: string,
): void {
  fn().catch((err: unknown) => logError("FAMILY", err, { context }));
}
