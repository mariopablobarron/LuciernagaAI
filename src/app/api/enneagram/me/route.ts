import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  bootstrapSessionIdentity,
  clearSessionCookie,
  InvalidSessionTokenError,
} from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof bootstrapSessionIdentity>>;
  try {
    identity = await bootstrapSessionIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ success: false, error: "INVALID_SESSION_TOKEN" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("CHAT", e, { route: "/api/enneagram/me" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }

  try {
    const prisma = getPrismaClient();
    const latest = await prisma.enneagramAssessment.findFirst({
      where: { userId: identity.userId },
      orderBy: { completedAt: "desc" },
    });

    const res = NextResponse.json({
      success: true,
      assessment: latest,
    });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (error) {
    logError("CHAT", error, { route: "/api/enneagram/me", method: "GET" });
    return NextResponse.json({ success: false, error: "INTERNAL" }, { status: 500 });
  }
}
