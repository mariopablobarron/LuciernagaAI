import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { isContentSafe } from "@/lib/content-safety";
import { assertNoPII } from "@/lib/pii-filters";
import { pickPromptForDate, todayInMadrid } from "@/lib/daily-round";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = ["💓", "🫂", "🔥", "🌱", "✨"] as const;
const MAX_OTHER_RESPONSES = 8;
const MAX_MIRRORS_PER_RESPONSE = 3;
const RESPONSE_MAX_LEN = 500;


// ─── GET /api/community/daily-round ─────────────────────────────────────────
// Devuelve la ronda del día. Si el usuario no ha respondido todavía, no
// se revelan las respuestas ajenas — pensado para no inducir comparación
// antes de que escriba la suya propia.
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    // Idempotent: if the cron did not run (or ran in another timezone), make sure
    // today's round always exists so the Cafetería is never "closed" for the user.
    const todayDate = todayInMadrid();
    const round = await prisma.dailyRound.upsert({
      where: { date: todayDate },
      create: { date: todayDate, prompt: pickPromptForDate(todayDate) },
      update: {},
      select: { id: true, prompt: true, date: true },
    });

    const myResponse = await prisma.dailyRoundResponse.findUnique({
      where: { roundId_userId: { roundId: round.id, userId: identity.userId } },
      select: { id: true, content: true, anonymous: true, createdAt: true, hidden: true },
    });

    if (!myResponse || myResponse.hidden) {
      return NextResponse.json({
        round: { id: round.id, prompt: round.prompt, date: round.date.toISOString() },
        me: { hasResponded: false, response: null },
        responses: [],
        allowedEmojis: ALLOWED_EMOJIS,
        myCircle: await loadMyCircle(identity.userId),
      });
    }

    // Carga respuestas ajenas + reactions + mirrors en una sola pasada.
    const otherRaw = await prisma.dailyRoundResponse.findMany({
      where: {
        roundId: round.id,
        hidden: false,
        userId: { not: identity.userId },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_OTHER_RESPONSES,
      select: {
        id: true,
        content: true,
        anonymous: true,
        createdAt: true,
        user: { select: { name: true } },
        reactions: { select: { emoji: true, userId: true } },
        mirrors: {
          where: { hidden: false },
          orderBy: { createdAt: "asc" },
          take: MAX_MIRRORS_PER_RESPONSE,
          select: { id: true, question: true, createdAt: true, authorId: true },
        },
      },
    });

    const responses = otherRaw.map((r) => {
      const counts = new Map<string, number>();
      let myEmoji: string | null = null;
      for (const rx of r.reactions) {
        counts.set(rx.emoji, (counts.get(rx.emoji) ?? 0) + 1);
        if (rx.userId === identity.userId) myEmoji = rx.emoji;
      }
      return {
        id: r.id,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        author: r.anonymous ? null : (r.user.name ? { name: r.user.name } : null),
        reactions: Object.fromEntries(counts),
        myEmoji,
        mirrors: r.mirrors.map((m) => ({
          id: m.id,
          question: m.question,
          createdAt: m.createdAt.toISOString(),
          isOwn: m.authorId === identity.userId,
        })),
      };
    });

    return NextResponse.json({
      round: { id: round.id, prompt: round.prompt, date: round.date.toISOString() },
      me: {
        hasResponded: true,
        response: {
          id: myResponse.id,
          content: myResponse.content,
          anonymous: myResponse.anonymous,
          createdAt: myResponse.createdAt.toISOString(),
        },
      },
      responses,
      allowedEmojis: ALLOWED_EMOJIS,
      myCircle: await loadMyCircle(identity.userId),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/daily-round", method: "GET" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

// ─── POST /api/community/daily-round ────────────────────────────────────────
// Publica mi respuesta a la ronda del día. Una sola por usuario por ronda
// (forzado por unique). Filtro de contenido antes de guardar.
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { content?: string; anonymous?: boolean };

    const content = (body.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "CONTENT_REQUIRED" }, { status: 400 });
    if (content.length > RESPONSE_MAX_LEN) {
      return NextResponse.json({ error: "CONTENT_TOO_LONG" }, { status: 400 });
    }
    if (!isContentSafe(content)) {
      logInfo("COMMUNITY", "daily_round_blocked_by_filter", { userId: identity.userId });
      return NextResponse.json(
        { error: "CONTENT_BLOCKED", message: "Tu mensaje contiene contenido que no podemos publicar. Si estás en crisis, llama al 024." },
        { status: 422 },
      );
    }

    const piiRound = assertNoPII(content);
    if (piiRound) {
      logInfo("COMMUNITY", "daily_round_blocked_by_pii", { userId: identity.userId, kinds: piiRound.kinds });
      return NextResponse.json(
        { error: piiRound.code, message: piiRound.message, kinds: piiRound.kinds },
        { status: 422 },
      );
    }

    const prisma = getPrismaClient();
    const round = await prisma.dailyRound.findUnique({
      where: { date: todayInMadrid() },
      select: { id: true },
    });
    if (!round) {
      return NextResponse.json({ error: "NO_ROUND_TODAY" }, { status: 404 });
    }

    const existing = await prisma.dailyRoundResponse.findUnique({
      where: { roundId_userId: { roundId: round.id, userId: identity.userId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "ALREADY_RESPONDED" }, { status: 409 });
    }

    const response = await prisma.dailyRoundResponse.create({
      data: {
        roundId: round.id,
        userId: identity.userId,
        content,
        anonymous: body.anonymous ?? true,
      },
      select: { id: true },
    });

    logInfo("COMMUNITY", "daily_round_response_created", { userId: identity.userId, responseId: response.id });
    return NextResponse.json({ ok: true, id: response.id });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/daily-round", method: "POST" });
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}

async function loadMyCircle(userId: string): Promise<{ id: string; name: string } | null> {
  const prisma = getPrismaClient();
  const m = await prisma.circleMember.findFirst({
    where: { userId, leftAt: null, circle: { isActive: true } },
    select: { circle: { select: { id: true, name: true } } },
  });
  return m?.circle ?? null;
}
