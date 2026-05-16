import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendUserEmail, buildHeartbeatEmail } from "@/lib/email";
import { pickEmailLocale } from "@/lib/email-i18n";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({
  email: z.string().email("Email inválido").max(254),
  beats: z.number().int().positive().max(10_000_000_000),
  // Locale del cliente — opcional, si no llega leemos de cookie.
  locale: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "Email y latidos requeridos" }, { status: 400 });
  }

  const { email, beats } = parsed.data;

  const rl = checkRateLimit(`calc-email:${email}`, 3, 3_600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Demasiados envios" }, { status: 429 });
  }

  // Locale para el contenido del email: body.locale (si lo manda el cliente)
  // → cookie NEXT_LOCALE → "es". Determina idioma de copy y formato numérico.
  const locale = pickEmailLocale(
    parsed.data.locale ?? req.cookies.get("NEXT_LOCALE")?.value
  );

  const appUrl = process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es";
  const heartbeatEmail = buildHeartbeatEmail({ to: email, beats, appUrl, locale });

  const ok = await sendUserEmail({ ...heartbeatEmail, template: "heartbeat" });
  if (!ok) {
    logError("CALCULATOR", new Error("Failed to send heartbeat email"), { email });
    return NextResponse.json({ error: "No se pudo enviar" }, { status: 500 });
  }

  logInfo("CALCULATOR", "heartbeat_email_sent", { email, beats });
  return NextResponse.json({ ok: true });
}
