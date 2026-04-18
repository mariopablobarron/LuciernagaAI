import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isContentSafe } from "@/lib/content-safety";
import { classifyAnswer } from "@/services/answerGuardian";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/community/questions/check-answer
 * Body: { content: string }
 * Returns a pedagogical classification of a draft answer BEFORE publishing.
 * Rate-limited to avoid LLM-cost abuse. Best-effort: if the classifier fails,
 * returns `{ ok: true, classification: null }` so the UI can publish anyway.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);

    // 20 guardian checks per hour per user — enough for normal use, blocks abuse.
    const rl = checkRateLimit(`guardian:${identity.userId}`, 20, 60 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "TOO_MANY_REQUESTS",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = (await req.json()) as { content?: string };
    const content = body.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json({ error: "CONTENT_REQUIRED" }, { status: 400 });
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: "TOO_LONG" }, { status: 400 });
    }
    // Sanity filter before spending tokens on banned content.
    if (!isContentSafe(content)) {
      return NextResponse.json({ error: "CONTENT_BLOCKED" }, { status: 422 });
    }

    const classification = await classifyAnswer(content, { userId: identity.userId });
    return NextResponse.json({ ok: true, classification });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/questions/check-answer" });
    return NextResponse.json({ error: "CHECK_FAILED" }, { status: 500 });
  }
}
