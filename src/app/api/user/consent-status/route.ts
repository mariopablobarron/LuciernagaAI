import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof resolveIdentity>>;
  try {
    identity = await resolveIdentity(req);
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ error: "INVALID_SESSION_TOKEN" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("CONSENT", error, { route: "/api/user/consent-status" });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }

  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { consentGiven: true, consentVersion: true, consentAt: true },
    });
    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const res = NextResponse.json({
      consentGiven: user.consentGiven,
      consentVersion: user.consentVersion,
      consentAt: user.consentAt?.toISOString() ?? null,
    });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (error) {
    logError("CONSENT", error, { route: "/api/user/consent-status", method: "GET" });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
