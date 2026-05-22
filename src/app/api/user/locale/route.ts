// Endpoint para persistir el locale activo del usuario en User.locale.
//
// Lo invoca LocaleSwitcher tras cambiar la cookie NEXT_LOCALE, para que los
// emails programados (nudges, weekly letter, family invites...) que se envían
// fuera de un request context usen el idioma correcto del usuario.
//
// No-op para usuarios anónimos (no hay userId): el switcher solo persiste la
// cookie y deja el locale viajando vía cookie hasta que el usuario haga
// signup. En ese momento, signup/route.ts persiste body.locale en User.locale.

import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { pickEmailLocale } from "@/lib/email-i18n";
import { logError, logInfo } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    let identity;
    try {
      identity = await resolveIdentity(req);
    } catch (authErr) {
      // Token expirado o inválido NO es un error del sistema — es una
      // cookie vieja. Tratamos igual que a un anónimo: el switcher solo
      // necesita la cookie NEXT_LOCALE, que ya persistió en el cliente.
      // Sin logError para no ensuciar SystemLog con ruido benigno.
      if (authErr instanceof InvalidSessionTokenError) {
        return NextResponse.json({ ok: true, persisted: false });
      }
      throw authErr;
    }

    if (!identity.userId) {
      // Anónimo: nada que persistir, devolvemos OK para no romper el switcher.
      return NextResponse.json({ ok: true, persisted: false });
    }

    const body = (await req.json().catch(() => null)) as { locale?: string } | null;
    const locale = pickEmailLocale(body?.locale ?? req.cookies.get("NEXT_LOCALE")?.value);

    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: identity.userId },
      data: { locale },
    });

    logInfo("USER", "locale_updated", { userId: identity.userId, locale });
    return NextResponse.json({ ok: true, persisted: true, locale });
  } catch (err) {
    logError("USER", err, { route: "/api/user/locale" });
    return NextResponse.json({ ok: false, error: "LOCALE_UPDATE_FAILED" }, { status: 500 });
  }
}
