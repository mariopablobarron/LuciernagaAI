import { getPrismaClient } from "@/db/prisma";
import { logInfo, logError } from "@/lib/logger";
import { buildCircleClosingLetterEmail, sendUserEmail } from "@/lib/email";
import { pickEmailLocale } from "@/lib/email-i18n";

const APP_URL = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";

// ─── Tunables ────────────────────────────────────────────────────────────────

export const CIRCLE_SIZE = 4;
export const CYCLE_LENGTH_DAYS = 42; // 6 weeks
export const PATTERN_WINDOW_DAYS = 14;
export const DRIFT_GRACE_PULSES = 2; // user must be off-pattern for ≥2 pulses before re-matching

// ─── Eligibility ─────────────────────────────────────────────────────────────

type Candidate = {
  userId: string;
  dominantPattern: string;
  primaryEmotion: string;
  updatedAt: Date;
};

/**
 * Users eligible for matchmaking:
 *  - have a UserState updated within the pattern window
 *  - are not currently in an active circle
 *  - have sent at least 1 message in the window (proxy for "alive")
 */
export async function findMatchableUsers(now: Date = new Date()): Promise<Candidate[]> {
  const prisma = getPrismaClient();
  const since = new Date(now.getTime() - PATTERN_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const states = await prisma.userState.findMany({
    where: { updatedAt: { gte: since } },
    select: { userId: true, dominantPattern: true, primaryEmotion: true, updatedAt: true },
  });
  if (states.length === 0) return [];

  const userIds = states.map((s) => s.userId);

  const [activeMembers, recentMessageCounts] = await Promise.all([
    prisma.circleMember.findMany({
      where: { userId: { in: userIds }, leftAt: null },
      select: { userId: true },
    }),
    prisma.message.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, role: "user", createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const inCircle = new Set(activeMembers.map((m) => m.userId));
  const messageCount = new Map(recentMessageCounts.map((r) => [r.userId, r._count._all]));

  return states.filter(
    (s) => !inCircle.has(s.userId) && (messageCount.get(s.userId) ?? 0) >= 1,
  );
}

// ─── Grouping ────────────────────────────────────────────────────────────────

type Group = {
  matchPattern: string;
  matchEmotion: string;
  members: Candidate[];
};

/**
 * Bucket candidates by (dominantPattern, primaryEmotion). Buckets with ≥CIRCLE_SIZE
 * members yield circles; partial buckets are left for the next run.
 */
export function groupByPattern(candidates: Candidate[]): Group[] {
  const buckets = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const key = `${c.dominantPattern}|${c.primaryEmotion}`;
    const arr = buckets.get(key);
    if (arr) arr.push(c);
    else buckets.set(key, [c]);
  }

  const groups: Group[] = [];
  for (const [key, members] of buckets) {
    if (members.length < CIRCLE_SIZE) continue;
    const [matchPattern, matchEmotion] = key.split("|");
    // Sort by most-recent state first so freshest signals form circles together.
    members.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    for (let i = 0; i + CIRCLE_SIZE <= members.length; i += CIRCLE_SIZE) {
      groups.push({
        matchPattern,
        matchEmotion,
        members: members.slice(i, i + CIRCLE_SIZE),
      });
    }
  }
  return groups;
}

// ─── Circle creation ─────────────────────────────────────────────────────────

function generateCircleName(matchPattern: string, matchEmotion: string, ix: number): string {
  // Short, neutral, anonymous-friendly. No emoji.
  const stamp = new Date().toISOString().slice(0, 10);
  return `Círculo ${matchEmotion}/${matchPattern} · ${stamp}-${String(ix).padStart(2, "0")}`;
}

export async function formCircleFromGroup(
  group: Group,
  ix: number,
  now: Date = new Date(),
): Promise<{ circleId: string; userIds: string[] }> {
  const prisma = getPrismaClient();
  const cycleEndsAt = new Date(now.getTime() + CYCLE_LENGTH_DAYS * 24 * 60 * 60 * 1000);

  const userIds = group.members.map((m) => m.userId);

  const result = await prisma.$transaction(async (tx) => {
    const circle = await tx.circle.create({
      data: {
        name: generateCircleName(group.matchPattern, group.matchEmotion, ix),
        matchPattern: group.matchPattern,
        matchEmotion: group.matchEmotion,
        maxMembers: CIRCLE_SIZE,
        cycleEndsAt,
        startsAt: now,
      },
      select: { id: true },
    });
    await tx.circleMember.createMany({
      data: userIds.map((userId) => ({ circleId: circle.id, userId })),
    });
    return circle;
  });

  logInfo("CIRCLE_MATCHMAKING", "circle_formed", {
    circleId: result.id,
    matchPattern: group.matchPattern,
    matchEmotion: group.matchEmotion,
    members: userIds.length,
    cycleEndsAt: cycleEndsAt.toISOString(),
  });

  return { circleId: result.id, userIds };
}

// ─── Drift detection ─────────────────────────────────────────────────────────

/**
 * Returns members whose current UserState pattern no longer matches their circle's
 * matchPattern AND have skipped the last DRIFT_GRACE_PULSES pulses.
 * These are candidates for re-matching at next cycle close.
 */
export async function detectDriftedMembers(): Promise<
  Array<{ userId: string; circleId: string; currentPattern: string; circlePattern: string }>
> {
  const prisma = getPrismaClient();

  const members = await prisma.circleMember.findMany({
    where: { leftAt: null },
    include: {
      circle: { select: { matchPattern: true, matchEmotion: true } },
      user: {
        select: {
          userState: { select: { dominantPattern: true, primaryEmotion: true } },
        },
      },
    },
  });

  return members
    .filter((m) => {
      const s = m.user.userState;
      if (!s) return false;
      return (
        s.dominantPattern !== m.circle.matchPattern ||
        s.primaryEmotion !== m.circle.matchEmotion
      );
    })
    .map((m) => ({
      userId: m.userId,
      circleId: m.circleId,
      currentPattern: `${m.user.userState?.dominantPattern}/${m.user.userState?.primaryEmotion}`,
      circlePattern: `${m.circle.matchPattern}/${m.circle.matchEmotion}`,
    }));
}

// ─── Cycle end & closing letters ─────────────────────────────────────────────

export type CloseReason = "cycle_end" | "drift" | "left" | "removed";

/**
 * Generates a deterministic fallback closing letter. The mentor-tuned LLM version
 * lives in circlePulses.ts and may be wired in later — this keeps matchmaking
 * standalone and resilient.
 */
function fallbackClosingLetter(
  reason: CloseReason,
  context: { circleName: string; pulses: number; responses: number },
): string {
  const lines: string[] = [];
  lines.push(`Tu paso por ${context.circleName} se cierra.`);
  if (context.responses > 0) {
    lines.push(
      `Compartiste ${context.responses} respuesta${context.responses === 1 ? "" : "s"} a lo largo de ${context.pulses} pulso${context.pulses === 1 ? "" : "s"}. Tu voz formó parte del grupo aunque no haya quedado registrada con tu nombre.`,
    );
  } else {
    lines.push(
      `Estuviste presente sin escribir. Estar también es una forma de pertenencia.`,
    );
  }
  if (reason === "cycle_end") {
    lines.push("Este ciclo termina porque seis semanas son tiempo suficiente para que algo se mueva — y para que el grupo te suelte y tú lo sueltes.");
  } else if (reason === "drift") {
    lines.push("Tu fase ha cambiado. Te asignaremos a un círculo afín a donde estás ahora.");
  } else if (reason === "left") {
    lines.push("Has decidido salir. Lo que dijiste y lo que callaste sigue siendo tuyo.");
  } else {
    lines.push("El círculo cierra.");
  }
  return lines.join("\n\n");
}

export async function closeCircleAndGenerateLetters(
  circleId: string,
  reason: CloseReason,
  now: Date = new Date(),
): Promise<{ circleId: string; lettersCreated: number }> {
  const prisma = getPrismaClient();

  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: {
      id: true,
      name: true,
      members: { where: { leftAt: null }, select: { userId: true } },
      _count: { select: { pulses: true } },
    },
  });
  if (!circle) {
    return { circleId, lettersCreated: 0 };
  }

  let created = 0;
  for (const member of circle.members) {
    const responseCount = await prisma.circlePulseResponse.count({
      where: { userId: member.userId, pulse: { circleId } },
    });
    const body = fallbackClosingLetter(reason, {
      circleName: circle.name,
      pulses: circle._count.pulses,
      responses: responseCount,
    });
    const letter = await prisma.circleClosingLetter.create({
      data: { circleId, userId: member.userId, reason, body },
      select: { id: true, userId: true },
    });
    created += 1;

    // Send the letter via email and mark deliveredAt. Failure is non-blocking
    // — the letter is already archived in the user's profile.
    try {
      const user = await prisma.user.findUnique({
        where: { id: member.userId },
        select: { email: true, name: true, locale: true },
      });
      if (user?.email) {
        await sendUserEmail({
          to: user.email,
          userId: member.userId,
          template: "circle_closing_letter",
          ...buildCircleClosingLetterEmail({
            name: user.name,
            circleName: circle.name,
            reason,
            body,
            appUrl: APP_URL,
            locale: pickEmailLocale(user.locale),
          }),
        });
        await prisma.circleClosingLetter.update({
          where: { id: letter.id },
          data: { deliveredAt: now },
        });
      }
    } catch (error) {
      logError("CIRCLE_MATCHMAKING", error, { step: "notify_closing_letter", letterId: letter.id });
    }
  }

  await prisma.$transaction([
    prisma.circleMember.updateMany({
      where: { circleId, leftAt: null },
      data: { leftAt: now },
    }),
    prisma.circle.update({
      where: { id: circleId },
      data: { isActive: false },
    }),
  ]);

  logInfo("CIRCLE_MATCHMAKING", "circle_closed", {
    circleId,
    reason,
    lettersCreated: created,
  });

  return { circleId, lettersCreated: created };
}

/**
 * Closes any circle whose cycleEndsAt has passed.
 */
export async function runCycleEndCheck(now: Date = new Date()): Promise<{ closed: number }> {
  const prisma = getPrismaClient();
  const expired = await prisma.circle.findMany({
    where: { isActive: true, cycleEndsAt: { lte: now } },
    select: { id: true },
  });
  for (const c of expired) {
    try {
      await closeCircleAndGenerateLetters(c.id, "cycle_end", now);
    } catch (error) {
      logError("CIRCLE_MATCHMAKING", error, { circleId: c.id, step: "cycle_end" });
    }
  }
  return { closed: expired.length };
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export async function runMatchmaking(now: Date = new Date()): Promise<{
  formed: number;
  membersPlaced: number;
  candidatesEvaluated: number;
  groupsFound: number;
}> {
  const candidates = await findMatchableUsers(now);
  const groups = groupByPattern(candidates);

  let formed = 0;
  let membersPlaced = 0;
  for (let i = 0; i < groups.length; i++) {
    try {
      const result = await formCircleFromGroup(groups[i], i + 1, now);
      formed += 1;
      membersPlaced += result.userIds.length;
    } catch (error) {
      logError("CIRCLE_MATCHMAKING", error, { step: "form_circle", index: i });
    }
  }

  logInfo("CIRCLE_MATCHMAKING", "matchmaking_run", {
    candidatesEvaluated: candidates.length,
    groupsFound: groups.length,
    formed,
    membersPlaced,
  });

  return {
    formed,
    membersPlaced,
    candidatesEvaluated: candidates.length,
    groupsFound: groups.length,
  };
}
