import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { isContentSafe } from "@/lib/content-safety";

export const dynamic = "force-dynamic";

const MIRROR_MAX_LEN = 180;
const MAX_MIRRORS_PER_RESPONSE = 3;
const MAX_MIRRORS_PER_USER_PER_DAY = 5;

// POST /api/community/daily-round/mirror
// Body: { responseId: string, question: string }
// Envía una pregunta corta a una respuesta ajena. Reglas:
// - 1 pregunta por autor por respuesta (unique constraint).
// - Máx 3 preguntas por respuesta (para no saturar al autor original).
// - Máx 5 preguntas por usuario al día (para no saturar a los demás).
// - No puedes mandar a tu propia respuesta.
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { responseId?: string; question?: string };
    const responseId = body.responseId;
    const question = (body.question ?? "").trim();

    if (!responseId) return NextResponse.json({ error: "RESPONSE_ID_REQUIRED" }, { status: 400 });
    if (!question) return NextResponse.json({ error: "QUESTION_REQUIRED" }, { status: 400 });
    if (question.length > MIRROR_MAX_LEN) {
      return NextResponse.json({ error: "QUESTION_TOO_LONG" }, { status: 400 });
    }
    if (!isContentSafe(question)) {
      logInfo("COMMUNITY", "mirror_blocked_by_filter", { userId: identity.userId });
      return NextResponse.json(
        { error: "CONTENT_BLOCKED", message: "Tu mensaje contiene contenido que no podemos publicar." },
        { status: 422 },
      );
    }

    const prisma = getPrismaClient();
    const target = await prisma.dailyRoundResponse.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        userId: true,
        hidden: true,
        _count: { select: { mirrors: { where: { hidden: false } } } },
      },
    });
    if (!target || target.hidden) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (target.userId === identity.userId) {
      return NextResponse.json({ error: "CANNOT_MIRROR_OWN" }, { status: 403 });
    }
    if (target._count.mirrors >= MAX_MIRRORS_PER_RESPONSE) {
      return NextResponse.json({ error: "RESPONSE_MIRROR_LIMIT" }, { status: 409 });
    }

    // Cap diario por usuario autor de espejo.
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const myToday = await prisma.dailyRoundMirror.count({
      where: { authorId: identity.userId, createdAt: { gte: todayStart } },
    });
    if (myToday >= MAX_MIRRORS_PER_USER_PER_DAY) {
      return NextResponse.json(
        { error: "AUTHOR_DAILY_LIMIT", message: `Máximo ${MAX_MIRRORS_PER_USER_PER_DAY} preguntas-espejo al día.` },
        { status: 429 },
      );
    }

    const mirror = await prisma.dailyRoundMirror.create({
      data: { responseId, authorId: identity.userId, question },
      select: { id: true },
    }).catch((err) => {
      // Unique (responseId, authorId) → ya envió pregunta a esta respuesta.
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        return null;
      }
      throw err;
    });

    if (!mirror) {
      return NextResponse.json({ error: "ALREADY_MIRRORED" }, { status: 409 });
    }

    logInfo("COMMUNITY", "daily_round_mirror_created", { userId: identity.userId, mirrorId: mirror.id });
    return NextResponse.json({ ok: true, id: mirror.id });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/daily-round/mirror", method: "POST" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
