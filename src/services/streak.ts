import { getPrismaClient } from "@/db/prisma";
import type { StreakSnapshot } from "@/types/impulse";

function getStartOfDay(reference = new Date()): Date {
  const next = new Date(reference);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayDiffInCalendarDays(left: Date, right: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((getStartOfDay(left).getTime() - getStartOfDay(right).getTime()) / msPerDay);
}

function serializeStreak(record: {
  currentDays: number;
  bestDays: number;
  lastCheckInDate: Date | null;
  status: string;
}): StreakSnapshot {
  return {
    currentDays: record.currentDays,
    bestDays: record.bestDays,
    lastCheckInDate: record.lastCheckInDate?.toISOString() ?? null,
    status: record.status,
  };
}

export async function getUserStreak(userId: string): Promise<StreakSnapshot | null> {
  const prisma = getPrismaClient();
  const streak = await prisma.streak.findUnique({
    where: { userId },
  });

  return streak ? serializeStreak(streak) : null;
}

export async function updateStreak(
  userId: string,
  referenceDate = new Date()
): Promise<StreakSnapshot> {
  const prisma = getPrismaClient();
  const today = getStartOfDay(referenceDate);
  const current = await prisma.streak.findUnique({
    where: { userId },
  });

  if (!current) {
    const created = await prisma.streak.create({
      data: {
        userId,
        currentDays: 1,
        bestDays: 1,
        lastCheckInDate: today,
        status: "active",
      },
    });

    return serializeStreak(created);
  }

  const lastDate = current.lastCheckInDate ? getStartOfDay(current.lastCheckInDate) : null;
  let currentDays = current.currentDays;
  let status = "active";

  if (!lastDate) {
    currentDays = 1;
  } else {
    const diff = dayDiffInCalendarDays(today, lastDate);
    if (diff <= 0) {
      currentDays = Math.max(1, current.currentDays);
      status = "active";
    } else if (diff === 1) {
      currentDays = current.currentDays + 1;
    } else {
      currentDays = 1;
      status = "restarted";
    }
  }

  const updated = await prisma.streak.update({
    where: { userId },
    data: {
      currentDays,
      bestDays: Math.max(current.bestDays, currentDays),
      lastCheckInDate: today,
      status,
    },
  });

  return serializeStreak(updated);
}
