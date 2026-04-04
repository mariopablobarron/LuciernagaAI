import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof resolveIdentity>>;

  try {
    identity = await resolveIdentity(req, { allowAnonymousBootstrap: true });
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { success: false, error: "Token inválido o expirado" },
        { status: 401 }
      );
      clearSessionCookie(res);
      return res;
    }

    logError("CONSENT", error, { route: "/api/user/consent", method: "POST" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }

  try {
    const prisma = getPrismaClient();
    const existingUser = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { consentGiven: true, consentAt: true, source: true },
    });

    const consentAt = existingUser?.consentAt ?? new Date();

    await prisma.user.update({
      where: { id: identity.userId },
      data: {
        consentGiven: true,
        consentAt,
        source: existingUser?.source ?? "web",
      },
    });

    const res = NextResponse.json({
      success: true,
      consentGiven: true,
      consentAt: consentAt.toISOString(),
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(res, identity.sessionToken);
    }

    return res;
  } catch (error: unknown) {
    logError("CONSENT", error, {
      route: "/api/user/consent",
      method: "POST",
      userId: identity.userId,
    });
    return NextResponse.json(
      { success: false, error: "No se pudo registrar el consentimiento" },
      { status: 500 }
    );
  }
}
