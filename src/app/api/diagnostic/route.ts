import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  IMPULSE_DIAGNOSTIC_TEST,
  getUserImpulseProfile,
  saveDiagnosticResult,
} from "@/services/impulse-diagnostic";
import { getUserStreak } from "@/services/streak";
import type { DiagnosticAnswerMap } from "@/types/impulse";

export async function GET(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const [profile, streak] = await Promise.all([
      getUserImpulseProfile(identity.userId),
      getUserStreak(identity.userId),
    ]);

    const response = NextResponse.json({
      success: true,
      test: IMPULSE_DIAGNOSTIC_TEST,
      profile,
      streak,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    logError("IMPULSE", error, { route: "/api/diagnostic", method: "GET" });
    return NextResponse.json(
      { success: false, error: "No se pudo cargar el diagnóstico." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const body = (await req.json()) as { answers?: DiagnosticAnswerMap };
    if (!body.answers) {
      return NextResponse.json(
        { success: false, error: "answers is required" },
        { status: 400 }
      );
    }

    const profile = await saveDiagnosticResult({
      userId: identity.userId,
      answers: body.answers,
    });
    const streak = await getUserStreak(identity.userId);

    const response = NextResponse.json({
      success: true,
      profile,
      streak,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    logError("IMPULSE", error, { route: "/api/diagnostic", method: "POST" });
    return NextResponse.json(
      { success: false, error: "No se pudo guardar el diagnóstico." },
      { status: 500 }
    );
  }
}
