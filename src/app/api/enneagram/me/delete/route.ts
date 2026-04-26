import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  bootstrapSessionIdentity,
  clearSessionCookie,
  InvalidSessionTokenError,
} from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";

/// Borra TODOS los EnneagramAssessment del usuario (incluidas las respuestas
/// crudas si existen). El usuario lo dispara desde /profile/eneagrama cuando
/// quiere ejercer su derecho a borrado o simplemente repetir el test desde
/// cero sin arrastrar histórico.
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
    logError("CHAT", e, { route: "/api/enneagram/me/delete" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }

  try {
    const prisma = getPrismaClient();
    const result = await prisma.enneagramAssessment.deleteMany({
      where: { userId: identity.userId },
    });

    logInfo("CHAT", "enneagram_assessments_deleted", {
      userId: identity.userId,
      deletedCount: result.count,
    });

    const res = NextResponse.json({ success: true, deleted: result.count });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (error) {
    logError("CHAT", error, { route: "/api/enneagram/me/delete", method: "POST" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }
}
