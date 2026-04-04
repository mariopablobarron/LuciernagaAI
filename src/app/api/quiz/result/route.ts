import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logInfo } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";
import { getPrismaClient } from "@/db/prisma";

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
    const prisma = getPrismaClient();

    // Fetch the most recent previous result before saving this one
    const previous = await prisma.quizResult.findFirst({
      where: { userId: identity.userId },
      orderBy: { createdAt: "desc" },
      select: { state: true, createdAt: true },
    });

    // Persist the new result
    await prisma.quizResult.create({
      data: { userId: identity.userId, state },
    });

    logInfo("QUIZ", "quiz_completed", { userId: identity.userId, state, previousState: previous?.state ?? null });

    notifyAdmin(
      `${STATE_EMOJI[state]} *Test diagnóstico completado*\n\nEstado detectado: *${state}*${previous ? `\nEstado anterior: ${previous.state}` : ""}\nUsuario: \`${identity.userId}\``
    );

    const response = NextResponse.json({
      success: true,
      state,
      previousState: previous?.state ?? null,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch {
    return NextResponse.json({ success: false, error: "QUIZ_TRACK_FAILED" }, { status: 500 });
  }
}
