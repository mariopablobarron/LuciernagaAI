import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { sendPushToUser } from "@/lib/web-push";
import { logError } from "@/lib/logger";

// POST /api/user/push/test
// Envía una notificación push de prueba al USUARIO ACTUAL. Útil para:
// (a) que el usuario verifique que sus notifs funcionan tras suscribirse
//     ("Probar notificación" en Settings → Notifications)
// (b) verificación E2E del flow completo desde Playwright/admin sin
//     necesitar CRON_SECRET ni esperar al cron real.
//
// Solo manda al usuario autenticado de la cookie. NO permite enviar a
// otros usuarios — eso sería herramienta admin separada.
export async function POST(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  try {
    await sendPushToUser(identity.userId, {
      title: "Funciona ✅",
      body: "Tus notificaciones están activas. Te avisaremos cuando una acción te esté esperando.",
      url: "/app",
      icon: "/icon-192.png",
      channel: "system",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("PUSH", error, { route: "/api/user/push/test", userId: identity.userId });
    return NextResponse.json({ error: "PUSH_TEST_FAILED" }, { status: 500 });
  }
}
