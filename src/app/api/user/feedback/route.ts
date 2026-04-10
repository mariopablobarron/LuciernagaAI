import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["suggestion", "bug", "other", "nps"] as const;

export async function POST(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  // Rate limit: 5 feedbacks per hour per user
  const rl = checkRateLimit(`feedback:${identity.userId}`, 5, 3_600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    type?: string;
    rating?: number;
    message?: string;
    page?: string;
  } | null;

  const message = body?.message?.trim() || "";
  const rating = typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5
    ? Math.round(body.rating)
    : null;

  // Require at least a rating or a message
  if (!rating && (!message || message.length < 5)) {
    return NextResponse.json({ error: "Incluye una valoración o un mensaje" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Mensaje muy largo (max 2000)" }, { status: 400 });
  }

  const type = VALID_TYPES.includes(body?.type as typeof VALID_TYPES[number])
    ? body!.type!
    : "suggestion";

  const prisma = getPrismaClient();
  const feedbackMessage = message || (rating ? `Rating: ${rating}/5` : "");

  // Try with rating column first; fall back without it if column doesn't exist yet
  try {
    await (prisma.feedback.create as Function)({
      data: {
        userId: identity.userId,
        type,
        rating,
        message: feedbackMessage,
        page: body?.page?.slice(0, 200) ?? null,
      },
    });
  } catch {
    // rating column may not exist in production yet — retry without it
    await prisma.feedback.create({
      data: {
        userId: identity.userId,
        type,
        message: feedbackMessage,
        page: body?.page?.slice(0, 200) ?? null,
      },
    });
  }

  logInfo("FEEDBACK", "feedback_created", { userId: identity.userId, type, rating });

  return NextResponse.json({ ok: true });
}
