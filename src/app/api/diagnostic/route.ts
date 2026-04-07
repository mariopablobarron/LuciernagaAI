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
import { getClientIp, withRateLimit } from "@/lib/rate-limit";

const MAX_BODY_SIZE = 50 * 1024; // 50 KB

export const GET = withRateLimit(async function GET(req: NextRequest) {
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
}, { limit: 60, keyFn: (req) => `rl:/api/diagnostic:${getClientIp(req)}` });

export const POST = withRateLimit(async function POST(req: NextRequest) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

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
}, { limit: 60, keyFn: (req) => `rl:/api/diagnostic:${getClientIp(req)}` });
