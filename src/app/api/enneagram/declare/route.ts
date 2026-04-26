import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  bootstrapSessionIdentity,
  clearSessionCookie,
  InvalidSessionTokenError,
} from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";

type Body = {
  /// Tipo dominante 1..9 declarado por el usuario (test externo o autoconocimiento).
  dominantType?: number;
  /// Ala 1..9 opcional. Debe ser vecina del dominante (±1, con módulo 9).
  wing?: number | null;
};

const DECLARED_VERSION = "self-declared-v1";

function isWingNeighbor(dominant: number, wing: number): boolean {
  // Vecinos cíclicos en el círculo 1..9 (1↔9, 1↔2, 2↔3, …, 8↔9).
  if (wing < 1 || wing > 9) return false;
  if (wing === dominant) return false;
  const diff = Math.abs(wing - dominant);
  return diff === 1 || diff === 8; // 8 cubre 1↔9
}

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
    logError("CHAT", e, { route: "/api/enneagram/declare" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const dominantType = Number(body.dominantType);
  if (!Number.isInteger(dominantType) || dominantType < 1 || dominantType > 9) {
    return NextResponse.json(
      { success: false, error: "INVALID_DOMINANT_TYPE" },
      { status: 400 }
    );
  }

  let wing: number | null = null;
  if (body.wing != null) {
    const w = Number(body.wing);
    if (!isWingNeighbor(dominantType, w)) {
      return NextResponse.json(
        { success: false, error: "INVALID_WING" },
        { status: 400 }
      );
    }
    wing = w;
  }

  // scoresByType placeholder: dominante a 40 (máximo posible), resto a 0.
  // Esto preserva la forma del modelo sin inventar puntuaciones.
  const scoresByType: Record<string, number> = {
    type1: 0, type2: 0, type3: 0, type4: 0, type5: 0,
    type6: 0, type7: 0, type8: 0, type9: 0,
  };
  scoresByType[`type${dominantType}`] = 40;
  if (wing) scoresByType[`type${wing}`] = 20;

  try {
    const prisma = getPrismaClient();
    const created = await prisma.enneagramAssessment.create({
      data: {
        userId: identity.userId,
        scoresByType,
        dominantType,
        wing,
        testVersion: DECLARED_VERSION,
      },
    });

    logInfo("CHAT", "enneagram_assessment_declared", {
      userId: identity.userId,
      assessmentId: created.id,
      dominantType,
      wing,
    });

    const res = NextResponse.json({
      success: true,
      assessmentId: created.id,
      dominantType,
      wing,
    });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (error) {
    logError("CHAT", error, { route: "/api/enneagram/declare", method: "POST" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }
}
