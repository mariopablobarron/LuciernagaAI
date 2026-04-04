import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logInfo } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";

const VALID_STATES = ["bloqueo", "ansiedad", "duda", "claridad", "neutral"] as const;
type QuizState = (typeof VALID_STATES)[number];

function isValidState(value: unknown): value is QuizState {
  return typeof value === "string" && (VALID_STATES as readonly string[]).includes(value);
}

const STATE_EMOJI: Record<QuizState, string> = {
  bloqueo: "🧱",
  ansiedad: "⚡",
  duda: "🌫️",
  claridad: "✨",
  neutral: "🔵",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { state?: unknown };

    if (!isValidState(body.state)) {
      return NextResponse.json({ success: false, error: "INVALID_STATE" }, { status: 400 });
    }

    const state = body.state;
    const identity = await bootstrapSessionIdentity(req);

    logInfo("QUIZ", "quiz_completed", { userId: identity.userId, state });

    notifyAdmin(
      `${STATE_EMOJI[state]} *Test diagnóstico completado*\n\nEstado detectado: *${state}*\nUsuario: \`${identity.userId}\``
    );

    const response = NextResponse.json({ success: true, state });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch {
    return NextResponse.json({ success: false, error: "QUIZ_TRACK_FAILED" }, { status: 500 });
  }
}
