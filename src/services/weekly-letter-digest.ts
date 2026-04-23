import { getPrismaClient } from "@/db/prisma";
import { getDominantState } from "@/services/state";
import type { UserState } from "@/domain/types";

export type WeeklyLetterDigest = {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  quotes: string[];
  dominantState: UserState;
  daysActive: number;
  messageCount: number;
};

export type WeeklyLetterDigestEmpty = {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  reason: "no_messages" | "no_valid_quotes" | "below_activity_threshold";
};

const MIN_QUOTE_LENGTH = 15;
const MAX_QUOTE_LENGTH = 180;
const MAX_QUOTES = 3;
const MIN_ACTIVE_DAYS = 3;

// Strip messages that contain obvious sensitive data before quoting them back.
// Conservative: drop the whole message rather than try to partially redact.
const SENSITIVE_PATTERNS = [
  /\b\d{13,19}\b/, // long digit sequences (cards, IDs)
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // emails
  /https?:\/\/\S+/i, // URLs
  /\b(?:\+?\d[\d\s-]{7,}\d)\b/, // phone numbers
];

function isQuotable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_QUOTE_LENGTH || trimmed.length > MAX_QUOTE_LENGTH) return false;
  return !SENSITIVE_PATTERNS.some((re) => re.test(trimmed));
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/**
 * Compute the Monday 00:00 UTC start and Sunday 23:59:59.999 UTC end of the
 * ISO week that contains `reference`. The letter covers the just-finished week
 * when the cron runs on Sunday evening.
 */
export function computeWeekWindow(reference: Date): { weekStart: Date; weekEnd: Date } {
  const day = reference.getUTCDay(); // 0=Sun ... 6=Sat
  const daysFromMonday = (day + 6) % 7;
  const weekStart = new Date(Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate() - daysFromMonday,
    0, 0, 0, 0,
  ));
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { weekStart, weekEnd };
}

/**
 * Extract material for a user's weekly letter. Returns WeeklyLetterDigestEmpty
 * when there is not enough signal (activity below threshold or no quotable
 * messages after filtering).
 */
export async function buildWeeklyDigest(params: {
  userId: string;
  reference?: Date;
}): Promise<WeeklyLetterDigest | WeeklyLetterDigestEmpty> {
  const reference = params.reference ?? new Date();
  const { weekStart, weekEnd } = computeWeekWindow(reference);

  const prisma = getPrismaClient();
  const messages = await prisma.message.findMany({
    where: {
      userId: params.userId,
      role: "user",
      createdAt: { gte: weekStart, lte: weekEnd },
    },
    select: { content: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length === 0) {
    return { userId: params.userId, weekStart, weekEnd, reason: "no_messages" };
  }

  const daySet = new Set<string>();
  for (const m of messages) daySet.add(dayKey(m.createdAt));
  if (daySet.size < MIN_ACTIVE_DAYS) {
    return { userId: params.userId, weekStart, weekEnd, reason: "below_activity_threshold" };
  }

  const quotable = messages
    .map((m) => m.content.trim())
    .filter(isQuotable);

  if (quotable.length === 0) {
    return { userId: params.userId, weekStart, weekEnd, reason: "no_valid_quotes" };
  }

  // Pick diverse quotes: longest first but cap to MAX_QUOTES; prefer distinct
  // messages (quotable is already deduped-by-content below).
  const seen = new Set<string>();
  const quotes: string[] = [];
  for (const q of quotable.sort((a, b) => b.length - a.length)) {
    if (seen.has(q)) continue;
    seen.add(q);
    quotes.push(q);
    if (quotes.length >= MAX_QUOTES) break;
  }

  return {
    userId: params.userId,
    weekStart,
    weekEnd,
    quotes,
    dominantState: getDominantState(messages.map((m) => m.content)),
    daysActive: daySet.size,
    messageCount: messages.length,
  };
}

export function isDigestUsable(
  digest: WeeklyLetterDigest | WeeklyLetterDigestEmpty,
): digest is WeeklyLetterDigest {
  return (digest as WeeklyLetterDigest).quotes !== undefined;
}
