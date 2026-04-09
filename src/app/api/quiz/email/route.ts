import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { buildQuizLeadEmail, sendUserEmail, type QuizState } from "@/lib/email";

const VALID_STATES: QuizState[] = ["bloqueo", "ansiedad", "duda", "claridad", "neutral"];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidState(value: unknown): value is QuizState {
  return typeof value === "string" && (VALID_STATES as string[]).includes(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: unknown; state?: unknown };

    if (!body.email || typeof body.email !== "string" || !isValidEmail(body.email)) {
      return NextResponse.json({ success: false, error: "EMAIL_INVALID" }, { status: 400 });
    }

    if (!isValidState(body.state)) {
      return NextResponse.json({ success: false, error: "INVALID_STATE" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tresmilmillonesdelatidos.es/explore";

    const email = buildQuizLeadEmail({
      to: body.email,
      state: body.state,
      appUrl,
    });

    const sent = await sendUserEmail(email);

    logInfo("QUIZ", "quiz_lead_email_sent", { email: body.email, state: body.state, sent });

    return NextResponse.json({ success: true, sent });
  } catch (error: unknown) {
    logError("QUIZ", error, { route: "/api/quiz/email", method: "POST" });
    return NextResponse.json({ success: false, error: "EMAIL_SEND_FAILED" }, { status: 500 });
  }
}
