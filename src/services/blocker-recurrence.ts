import { getPrismaClient } from "@/db/prisma";
import { detectUserState } from "@/services/state";
import type { UserState } from "@/domain/types";

export type RecurrentStateSignal =
  | { isRecurrent: false }
  | { isRecurrent: true; state: UserState; daysHit: number };

export type RecurrenceOptions = {
  windowDays?: number;
  minDaysHit?: number;
  states?: UserState[];
  now?: Date;
};

const DEFAULTS = {
  windowDays: 7,
  minDaysHit: 2,
  states: ["bloqueo", "ansiedad"] as UserState[],
};

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export async function detectRecurrentState(
  userId: string,
  options: RecurrenceOptions = {},
): Promise<RecurrentStateSignal> {
  const windowDays = options.windowDays ?? DEFAULTS.windowDays;
  const minDaysHit = options.minDaysHit ?? DEFAULTS.minDaysHit;
  const targetStates = options.states ?? DEFAULTS.states;
  const now = options.now ?? new Date();

  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const prisma = getPrismaClient();
  const messages = await prisma.message.findMany({
    where: { userId, role: "user", createdAt: { gte: since } },
    select: { content: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length === 0) return { isRecurrent: false };

  // Defensive in-memory filter: some test mocks return unfiltered rows.
  const sinceMs = since.getTime();
  const nowMs = now.getTime();

  // Group messages by calendar day (UTC).
  const byDay = new Map<string, string[]>();
  for (const m of messages) {
    const t = m.createdAt.getTime();
    if (t < sinceMs || t > nowMs) continue;
    const key = dayKey(m.createdAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(m.content);
    else byDay.set(key, [m.content]);
  }

  // For each day, pick the dominant state restricted to target states.
  // A day "hits" a state if any message in that day classifies to it.
  const daysByState = new Map<UserState, Set<string>>();
  for (const [day, contents] of byDay) {
    for (const content of contents) {
      const s = detectUserState(content);
      if (!targetStates.includes(s)) continue;
      let set = daysByState.get(s);
      if (!set) {
        set = new Set();
        daysByState.set(s, set);
      }
      set.add(day);
    }
  }

  // Return the state with the most distinct days that meets the threshold.
  // Priority by order in targetStates (bloqueo before ansiedad).
  let best: { state: UserState; daysHit: number } | null = null;
  for (const state of targetStates) {
    const days = daysByState.get(state)?.size ?? 0;
    if (days >= minDaysHit && (best === null || days > best.daysHit)) {
      best = { state, daysHit: days };
    }
  }

  if (!best) return { isRecurrent: false };
  return { isRecurrent: true, state: best.state, daysHit: best.daysHit };
}
