import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  bootstrapSessionIdentity,
  clearSessionCookie,
  InvalidSessionTokenError,
} from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import {
  ENNEAGRAM_ITEMS,
  scoreEnneagram,
  type LikertAnswer,
} from "@/data/enneagram-oeps";

type Body = {
  /// Mapa { qXX: 1..5 } con las 90 respuestas. Se valida server-side.
  answers?: Record<string, number>;
};

const VALID_IDS = new Set(ENNEAGRAM_ITEMS.map((i) => i.id));

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof bootstrapSessionIdentity>>;
  try {
    identity = await bootstrapSessionIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ success: false, error: "INVALID_SESSION_TOKEN" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("CHAT", e, { route: "/api/enneagram/submit" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const rawAnswers = body.answers ?? {};
  const cleaned: Partial<Record<string, LikertAnswer>> = {};

  for (const [id, value] of Object.entries(rawAnswers)) {
    if (!VALID_IDS.has(id)) continue;
    if (value !== 1 && value !== 2 && value !== 3 && value !== 4 && value !== 5) continue;
    cleaned[id] = value;
  }

  // Exigimos al menos el 80% respondido para considerar el test válido.
  // Por debajo, los scores son ruido y no merece guardar.
  const answeredCount = Object.keys(cleaned).length;
  if (answeredCount < Math.ceil(ENNEAGRAM_ITEMS.length * 0.8)) {
    return NextResponse.json(
      { success: false, error: "NOT_ENOUGH_ANSWERS", answered: answeredCount, required: ENNEAGRAM_ITEMS.length },
      { status: 400 }
    );
  }

  const result = scoreEnneagram(cleaned);

  try {
    const prisma = getPrismaClient();
    const created = await prisma.enneagramAssessment.create({
      data: {
        userId: identity.userId,
        scoresByType: result.scoresByType,
        dominantType: result.dominantType,
        wing: result.wing,
        rawAnswers: cleaned as unknown as object,
      },
    });

    logInfo("CHAT", "enneagram_assessment_completed", {
      userId: identity.userId,
      assessmentId: created.id,
      dominantType: result.dominantType,
      wing: result.wing,
      answered: answeredCount,
    });

    const res = NextResponse.json({
      success: true,
      assessmentId: created.id,
      dominantType: result.dominantType,
      wing: result.wing,
      scoresByType: result.scoresByType,
      ranking: result.ranking,
    });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (error) {
    logError("CHAT", error, { route: "/api/enneagram/submit", method: "POST" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }
}
