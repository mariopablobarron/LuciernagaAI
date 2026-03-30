import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { assignChallengesForUser, listActiveUserChallenges } from "@/services/impulse-challenges";
import { getUserImpulseProfile } from "@/services/impulse-diagnostic";
import { getUserStreak } from "@/services/streak";

async function buildChallengePayload(userId: string) {
  const [profile, challenges, streak] = await Promise.all([
    getUserImpulseProfile(userId),
    listActiveUserChallenges(userId),
    getUserStreak(userId),
  ]);

  return {
    profile,
    challenges,
    streak,
  };
}

export async function GET(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const response = NextResponse.json({
      success: true,
      ...(await buildChallengePayload(identity.userId)),
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    logError("IMPULSE", error, { route: "/api/challenge/assign", method: "GET" });
    return NextResponse.json(
      { success: false, error: "No se pudieron cargar los retos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const profile = await getUserImpulseProfile(identity.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Completa primero el diagnóstico." },
        { status: 400 }
      );
    }

    const challenges = await assignChallengesForUser(identity.userId);
    const streak = await getUserStreak(identity.userId);

    const response = NextResponse.json({
      success: true,
      profile,
      challenges,
      streak,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    logError("IMPULSE", error, { route: "/api/challenge/assign", method: "POST" });
    return NextResponse.json(
      { success: false, error: "No se pudieron asignar retos." },
      { status: 500 }
    );
  }
}
