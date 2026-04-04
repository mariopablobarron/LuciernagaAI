import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getPrismaClient } from "@/db/prisma";
import { getActiveGoalForUser } from "@/services/goals";
import type { UserState } from "@/domain/types";

export async function GET(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof resolveIdentity>>;

  try {
    identity = await resolveIdentity(req, { allowAnonymousBootstrap: true });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { success: false, error: "Token inválido o expirado" },
        { status: 401 }
      );
      clearSessionCookie(res);
      return res;
    }
    logError("STATE", e, { route: "/api/user/state", method: "GET" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }

  try {
    const prisma = getPrismaClient();

    const [userStateRecord, userRecord, activeGoal, streakRecord] = await Promise.all([
      prisma.userState.findUnique({
        where: { userId: identity.userId },
        select: { state: true, primaryEmotion: true, progressTrend: true },
      }),
      prisma.user.findUnique({
        where: { id: identity.userId },
        select: { consentGiven: true },
      }),
      getActiveGoalForUser(identity.userId),
      prisma.streak.findUnique({
        where: { userId: identity.userId },
        select: { currentDays: true },
      }),
    ]);

    const state: UserState = (userStateRecord?.state as UserState) ?? "neutral";
    const primaryEmotion = userStateRecord?.primaryEmotion ?? "calma";
    const progressTrend = userStateRecord?.progressTrend ?? "igual";
    const consentGiven = userRecord?.consentGiven ?? false;
    const streakDays = streakRecord?.currentDays ?? 0;
    const progress = activeGoal?.progress ?? 0;
    const pendingActions = (activeGoal?.actions ?? [])
      .filter((a) => !a.completed)
      .map((a) => ({ id: a.id, description: a.description }));

    const res = NextResponse.json({
      success: true,
      state,
      primaryEmotion,
      progressTrend,
      consentGiven,
      streakDays,
      progress,
      pendingActions,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(res, identity.sessionToken);
    }

    return res;
  } catch (error: unknown) {
    logError("STATE", error, {
      route: "/api/user/state",
      method: "GET",
      userId: identity.userId,
    });
    return NextResponse.json(
      { success: false, error: "No se pudo cargar el estado" },
      { status: 500 }
    );
  }
}
