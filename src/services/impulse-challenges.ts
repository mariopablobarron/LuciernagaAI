import { getPrismaClient } from "@/db/prisma";
import {
  ensureImpulseCatalog,
  IMPULSE_CHALLENGE_DEFINITIONS,
} from "@/services/impulse-catalog";
import { getUserImpulseProfile } from "@/services/impulse-diagnostic";
import type {
  DailyImpulseLogSnapshot,
  ImpulseChallengeSnapshot,
  ImpulseProfileCode,
} from "@/types/impulse";

function addDays(baseDate: Date, days: number): Date {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function getStartOfDay(reference = new Date()): Date {
  const next = new Date(reference);
  next.setHours(0, 0, 0, 0);
  return next;
}

function serializeChallenge(record: {
  id: string;
  status: string;
  progress: number;
  completedDays: number;
  totalDays: number;
  startedAt: Date;
  endsAt: Date | null;
  validationNote: string | null;
  challenge: {
    slug: string;
    title: string;
    description: string;
    type: string;
    difficulty: number;
    durationDays: number;
    estimatedMinutes: number;
    instructions: string;
    successMetric: string;
  };
}): ImpulseChallengeSnapshot {
  return {
    id: record.id,
    slug: record.challenge.slug,
    title: record.challenge.title,
    description: record.challenge.description,
    type: record.challenge.type as ImpulseChallengeSnapshot["type"],
    difficulty: record.challenge.difficulty,
    durationDays: record.challenge.durationDays,
    estimatedMinutes: record.challenge.estimatedMinutes,
    instructions: record.challenge.instructions,
    successMetric: record.challenge.successMetric,
    status: record.status,
    progress: record.progress,
    completedDays: record.completedDays,
    totalDays: record.totalDays,
    startedAt: record.startedAt.toISOString(),
    endsAt: record.endsAt?.toISOString() ?? null,
    validationNote: record.validationNote,
  };
}

function resolveDifficultyTarget(completedChallenges: number): number {
  if (completedChallenges >= 4) {
    return 3;
  }

  if (completedChallenges >= 2) {
    return 2;
  }

  return 1;
}

function orderChallengesForProfile(profileCode: ImpulseProfileCode) {
  return IMPULSE_CHALLENGE_DEFINITIONS.filter((item) => item.profileCode === profileCode).sort(
    (left, right) => left.difficulty - right.difficulty
  );
}

export async function listActiveUserChallenges(
  userId: string
): Promise<ImpulseChallengeSnapshot[]> {
  const prisma = getPrismaClient();
  const active = await prisma.userChallenge.findMany({
    where: {
      userId,
      status: "active",
    },
    include: {
      challenge: true,
    },
    orderBy: [{ progress: "asc" }, { startedAt: "desc" }],
  });

  return active.map(serializeChallenge);
}

export async function assignChallengesForUser(
  userId: string
): Promise<ImpulseChallengeSnapshot[]> {
  const prisma = getPrismaClient();
  await ensureImpulseCatalog();

  const profile = await getUserImpulseProfile(userId);
  if (!profile) {
    return [];
  }

  const [existingActive, completedChallenges] = await Promise.all([
    prisma.userChallenge.findMany({
      where: {
        userId,
        status: "active",
      },
      select: {
        challenge: {
          select: {
            slug: true,
          },
        },
      },
    }),
    prisma.userChallenge.count({
      where: {
        userId,
        status: "completed",
      },
    }),
  ]);

  if (existingActive.length >= 2) {
    return listActiveUserChallenges(userId);
  }

  const difficultyTarget = resolveDifficultyTarget(completedChallenges);
  const activeSlugs = new Set(existingActive.map((item) => item.challenge.slug));

  const candidates = orderChallengesForProfile(profile.code).filter((challenge) => {
    return !activeSlugs.has(challenge.slug) && challenge.difficulty <= difficultyTarget + 1;
  });

  const toAssign = candidates.slice(0, Math.max(0, 2 - existingActive.length));
  if (toAssign.length === 0) {
    return listActiveUserChallenges(userId);
  }

  for (const challenge of toAssign) {
    const challengeRecord = await prisma.challenge.findUnique({
      where: { slug: challenge.slug },
      select: { id: true, durationDays: true },
    });

    if (!challengeRecord) {
      continue;
    }

    await prisma.userChallenge.create({
      data: {
        userId,
        challengeId: challengeRecord.id,
        totalDays: challengeRecord.durationDays,
        endsAt: addDays(new Date(), challengeRecord.durationDays),
      },
    });
  }

  return listActiveUserChallenges(userId);
}

export async function updateActiveChallengesFromCheckin(params: {
  userId: string;
  note: string;
  challengeStatus?: string | null;
  date?: Date;
}): Promise<ImpulseChallengeSnapshot[]> {
  const prisma = getPrismaClient();
  const effectiveDate = params.date ?? new Date();
  const startOfDay = getStartOfDay(effectiveDate);

  const activeChallenges = await prisma.userChallenge.findMany({
    where: {
      userId: params.userId,
      status: "active",
    },
    include: {
      challenge: true,
    },
    orderBy: {
      startedAt: "asc",
    },
  });

  for (const record of activeChallenges) {
    const alreadyUpdatedToday =
      record.lastCheckInAt && getStartOfDay(record.lastCheckInAt).getTime() === startOfDay.getTime();

    if (alreadyUpdatedToday) {
      continue;
    }

    const nextCompletedDays = Math.min(record.totalDays, record.completedDays + 1);
    const nextProgress = Math.round((nextCompletedDays / Math.max(1, record.totalDays)) * 100);
    const nextStatus = nextCompletedDays >= record.totalDays ? "completed" : "active";

    await prisma.userChallenge.update({
      where: { id: record.id },
      data: {
        completedDays: nextCompletedDays,
        progress: nextProgress,
        status: nextStatus,
        lastCheckInAt: effectiveDate,
        validationNote: params.challengeStatus?.trim() || params.note.trim(),
      },
    });
  }

  return listActiveUserChallenges(params.userId);
}

export async function upsertDailyImpulseLog(params: {
  userId: string;
  note: string;
  emotionalState: string;
  mood?: string | null;
  challengeStatus?: string | null;
  momentum?: number | null;
  incrementCheckin?: boolean;
  incrementMessage?: boolean;
  createdAt?: Date;
}): Promise<DailyImpulseLogSnapshot> {
  const prisma = getPrismaClient();
  const createdAt = params.createdAt ?? new Date();
  const startOfDay = getStartOfDay(createdAt);
  const endOfDay = addDays(startOfDay, 1);

  const existing = await prisma.dailyLog.findFirst({
    where: {
      userId: params.userId,
      logDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const nextMomentum =
    params.momentum == null ? null : Math.max(1, Math.min(5, Math.round(params.momentum)));

  const log = existing
    ? await prisma.dailyLog.update({
        where: {
          id: existing.id,
        },
        data: {
          note: params.note.trim(),
          emotionalState: params.emotionalState,
          mood: params.mood ?? existing.mood,
          challengeStatus: params.challengeStatus ?? existing.challengeStatus,
          momentum: nextMomentum ?? existing.momentum,
          checkIns: params.incrementCheckin ? existing.checkIns + 1 : existing.checkIns,
          messagesCount: params.incrementMessage ? existing.messagesCount + 1 : existing.messagesCount,
        },
      })
    : await prisma.dailyLog.create({
        data: {
          userId: params.userId,
          logDate: startOfDay,
          note: params.note.trim(),
          emotionalState: params.emotionalState,
          mood: params.mood ?? null,
          challengeStatus: params.challengeStatus ?? null,
          momentum: nextMomentum,
          checkIns: params.incrementCheckin ? 1 : 0,
          messagesCount: params.incrementMessage ? 1 : 0,
          createdAt,
        },
      });

  return {
    id: log.id,
    emotionalState: log.emotionalState,
    note: log.note,
    mood: log.mood,
    challengeStatus: log.challengeStatus,
    momentum: log.momentum,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function listRecentImpulseLogs(
  userId: string,
  limit = 7
): Promise<DailyImpulseLogSnapshot[]> {
  const prisma = getPrismaClient();
  const logs = await prisma.dailyLog.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.max(1, limit),
  });

  return logs.map((log) => ({
    id: log.id,
    emotionalState: log.emotionalState,
    note: log.note,
    mood: log.mood,
    challengeStatus: log.challengeStatus,
    momentum: log.momentum,
    createdAt: log.createdAt.toISOString(),
  }));
}
