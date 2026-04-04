import { type NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET — returns primary active challenge + today's check-in status
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const userChallenge = await prisma.userChallenge.findFirst({
      where: { userId: identity.userId, status: "active" },
      include: { challenge: true },
      orderBy: { startedAt: "asc" },
    });

    const response = NextResponse.json({ ok: true, reto: userChallenge ? serialize(userChallenge) : null });
    if (identity.shouldSetCookie) attachSessionCookie(response, identity.sessionToken);
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ ok: false }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("RETO", error, { action: "get_reto_del_dia" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// PATCH — record today's check-in: { done: boolean, note?: string }
export async function PATCH(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { done: boolean; note?: string };
    const prisma = getPrismaClient();

    const uc = await prisma.userChallenge.findFirst({
      where: { userId: identity.userId, status: "active" },
      include: { challenge: true },
      orderBy: { startedAt: "asc" },
    });

    if (!uc) {
      return NextResponse.json({ ok: false, error: "No active challenge" }, { status: 404 });
    }

    // Avoid double check-in on same day
    if (uc.lastCheckInAt && isToday(uc.lastCheckInAt)) {
      return NextResponse.json({ ok: true, reto: serialize(uc), alreadyDone: true });
    }

    const newCompletedDays = body.done ? uc.completedDays + 1 : uc.completedDays;
    const newProgress = Math.min(100, Math.round((newCompletedDays / uc.totalDays) * 100));
    const isCompleted = newCompletedDays >= uc.totalDays;

    const updated = await prisma.userChallenge.update({
      where: { id: uc.id },
      data: {
        completedDays: newCompletedDays,
        progress: newProgress,
        lastCheckInAt: new Date(),
        status: isCompleted ? "completed" : "active",
        validationNote: body.note ?? null,
      },
      include: { challenge: true },
    });

    // Update DailyLog.challengeStatus for today
    const today = todayStart();
    const existing = await prisma.dailyLog.findFirst({
      where: { userId: identity.userId, logDate: { gte: today } },
    });
    if (existing) {
      await prisma.dailyLog.update({
        where: { id: existing.id },
        data: { challengeStatus: body.done ? "done" : "skip" },
      });
    } else {
      await prisma.dailyLog.create({
        data: {
          userId: identity.userId,
          logDate: today,
          challengeStatus: body.done ? "done" : "skip",
        },
      });
    }

    const response = NextResponse.json({
      ok: true,
      reto: serialize(updated),
      justCompleted: isCompleted,
    });
    if (identity.shouldSetCookie) attachSessionCookie(response, identity.sessionToken);
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ ok: false }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("RETO", error, { action: "checkin_reto_del_dia" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function serialize(uc: {
  id: string;
  completedDays: number;
  totalDays: number;
  progress: number;
  lastCheckInAt: Date | null;
  validationNote: string | null;
  status: string;
  challenge: {
    title: string;
    instructions: string;
    successMetric: string;
    type: string;
    estimatedMinutes: number;
    durationDays: number;
  };
}) {
  const checkedInToday = !!uc.lastCheckInAt && isToday(uc.lastCheckInAt);

  // Derive today's result from DailyLog not tracked here, use validationNote as proxy
  // If checked in today, we know status from completedDays progression
  return {
    id: uc.id,
    title: uc.challenge.title,
    instructions: uc.challenge.instructions,
    successMetric: uc.challenge.successMetric,
    type: uc.challenge.type,
    estimatedMinutes: uc.challenge.estimatedMinutes,
    dayNumber: uc.completedDays + (checkedInToday ? 0 : 1), // "today is day X"
    totalDays: uc.challenge.durationDays,
    completedDays: uc.completedDays,
    progress: uc.progress,
    status: uc.status,
    checkedInToday,
    todayDone: checkedInToday && uc.validationNote !== "skip",
    validationNote: uc.validationNote,
  };
}
