import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { CURRENT_CONSENT_VERSION } from "@/lib/legal";

type ConsentBody = {
  /// Versión del texto que vio y aceptó el usuario en el cliente.
  /// Si no llega, asumimos versión actual (compat con clientes antiguos
  /// que sólo enviaban `{consent:true}`), pero el camino preferido es
  /// que llegue explícita para evitar aceptaciones tácitas de versiones
  /// que el cliente no vio.
  consentVersion?: string;
};

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

  let body: ConsentBody = {};
  try {
    body = (await req.json()) as ConsentBody;
  } catch {
    // Sin body — toleramos por compat. Se asume CURRENT_CONSENT_VERSION abajo.
  }

  const consentVersion = body.consentVersion ?? CURRENT_CONSENT_VERSION;
  if (consentVersion !== CURRENT_CONSENT_VERSION) {
    return NextResponse.json(
      { success: false, error: "CONSENT_VERSION_MISMATCH", currentVersion: CURRENT_CONSENT_VERSION },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrismaClient();
    const existingUser = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { consentGiven: true, consentAt: true, source: true },
    });

    // En re-consent (publicamos texto nuevo) el consentAt SÍ se actualiza
    // a la fecha de la nueva aceptación. Sólo si nunca aceptó antes.
    const consentAt = existingUser?.consentGiven ? existingUser.consentAt ?? new Date() : new Date();

    await prisma.user.update({
      where: { id: identity.userId },
      data: {
        consentGiven: true,
        consentAt,
        consentVersion,
        source: existingUser?.source ?? "web",
      },
    });

    const res = NextResponse.json({
      success: true,
      consentGiven: true,
      consentVersion,
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
