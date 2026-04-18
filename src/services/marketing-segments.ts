import { getPrismaClient } from "@/db/prisma";

export type SegmentKey = "all" | "active_7d" | "inactive_7d" | "pro" | "free" | "crisis" | string;

export type MarketingRecipient = {
  id: string;
  email: string;
  telegramId: string | null;
  name: string | null;
};

// Kept for endswith checks in this module. isSyntheticEmail in services/user.ts
// handles both this and the legacy pre-rebrand domain.
const SYNTHETIC_EMAIL_DOMAIN = "session.latidos.local";

/**
 * Returns users matching a given marketing segment.
 */
export async function getRecipientsBySegment(
  segment: SegmentKey
): Promise<MarketingRecipient[]> {
  const prisma = getPrismaClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const select = {
    id: true,
    email: true,
    telegramId: true,
    name: true,
  } as const;

  switch (segment) {
    case "all":
      return prisma.user.findMany({
        where: { isActive: true },
        select,
      });

    case "active_7d":
      return prisma.user.findMany({
        where: { isActive: true, lastSeen: { gte: sevenDaysAgo } },
        select,
      });

    case "inactive_7d":
      return prisma.user.findMany({
        where: { isActive: true, lastSeen: { lt: sevenDaysAgo } },
        select,
      });

    case "pro":
      return prisma.user.findMany({
        where: {
          isActive: true,
          subscriptions: {
            some: {
              plan: "pro",
              status: { in: ["active", "trialing"] },
            },
          },
        },
        select,
      });

    case "free":
      return prisma.user.findMany({
        where: {
          isActive: true,
          subscriptions: {
            none: {
              plan: "pro",
              status: { in: ["active", "trialing"] },
            },
          },
        },
        select,
      });

    case "crisis":
      return prisma.user.findMany({
        where: {
          isActive: true,
          userState: { crisisActive: true },
        },
        select,
      });

    default: {
      // Handle "state:X" dynamic segments
      if (segment.startsWith("state:")) {
        const stateValue = segment.slice("state:".length);
        return prisma.user.findMany({
          where: {
            isActive: true,
            userState: { state: stateValue },
          },
          select,
        });
      }
      // Handle "tag:X" — users manually tagged by the marketing team
      if (segment.startsWith("tag:")) {
        const tag = segment.slice("tag:".length).toLowerCase().trim();
        if (!tag) return [];
        return prisma.user.findMany({
          where: {
            isActive: true,
            tags: { has: tag },
          },
          select,
        });
      }
      return [];
    }
  }
}

export type SegmentCounts = {
  telegram: number;
  email: number;
  total: number;
};

/**
 * Counts users in a segment, optionally filtered by channel reachability.
 *
 * When called with only a segment key, returns counts for all channels:
 *   { telegram, email, total }
 *
 * When called with a channel argument, returns a single number:
 * - telegram: only users with a non-null telegramId
 * - email:    only users whose email does NOT end in a synthetic session domain
 * - all:      total segment size (no channel filter)
 */
export async function countSegment(segment: SegmentKey): Promise<SegmentCounts>;
export async function countSegment(segment: SegmentKey, channel: "telegram" | "email" | "all"): Promise<number>;
export async function countSegment(
  segment: SegmentKey,
  channel?: "telegram" | "email" | "all"
): Promise<number | SegmentCounts> {
  const recipients = await getRecipientsBySegment(segment);

  if (channel === undefined) {
    return {
      telegram: recipients.filter((r) => r.telegramId != null).length,
      email: recipients.filter(
        (r) => !r.email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)
      ).length,
      total: recipients.length,
    };
  }

  switch (channel) {
    case "telegram":
      return recipients.filter((r) => r.telegramId != null).length;
    case "email":
      return recipients.filter(
        (r) => !r.email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)
      ).length;
    case "all":
      return recipients.length;
  }
}
