import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { listRecentImpulseLogs } from "@/services/impulse-challenges";
import { getUserImpulseProfile } from "@/services/impulse-diagnostic";
import { getImpulseInsightsForUser } from "@/services/impulse-insights";
import { getUserStreak } from "@/services/streak";

export async function GET(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const [profile, streak, logs, insights] = await Promise.all([
      getUserImpulseProfile(identity.userId),
      getUserStreak(identity.userId),
      listRecentImpulseLogs(identity.userId, 7),
      getImpulseInsightsForUser(identity.userId),
    ]);

    const response = NextResponse.json({
      success: true,
      profile,
      streak,
      logs,
      insights,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    logError("IMPULSE", error, { route: "/api/insights", method: "GET" });
    return NextResponse.json(
      { success: false, error: "No se pudieron generar insights." },
      { status: 500 }
    );
  }
}
