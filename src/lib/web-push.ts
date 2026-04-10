import webPush from "web-push";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

// ─── VAPID config ────────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  channel?: string;
};

// ─── Core send function ──────────────────────────────────────────────────────

async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string; id: string },
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 }, // 1 hour
    );
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 410 Gone or 404 = subscription expired, remove it
    if (statusCode === 410 || statusCode === 404) {
      const prisma = getPrismaClient();
      await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => null);
      logInfo("PUSH", "subscription_expired_removed", { subscriptionId: subscription.id });
    } else {
      logError("PUSH", err, { endpoint: subscription.endpoint });
    }
    return false;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a push notification to all devices of a user and create a Notification record.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const prisma = getPrismaClient();

  // Create in-app notification record
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      icon: payload.icon,
      channel: payload.channel ?? "system",
    },
  });

  // Send web push to all subscribed devices
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendToSubscription(sub, payload)),
  );

  const pushed = results.some((r) => r.status === "fulfilled" && r.value);
  if (pushed) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { pushed: true, pushedAt: new Date() },
    });
  }
}

/**
 * Send a push notification to multiple users.
 */
export async function broadcastPush(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}

/**
 * Create an in-app notification WITHOUT sending a push (for non-urgent items).
 */
export async function createNotification(
  userId: string,
  payload: Omit<PushPayload, "channel"> & { channel?: string },
): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      icon: payload.icon,
      channel: payload.channel ?? "system",
    },
  });
}
