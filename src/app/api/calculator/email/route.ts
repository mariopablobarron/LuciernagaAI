import { type NextRequest, NextResponse } from "next/server";
import { sendUserEmail, buildHeartbeatEmail } from "@/lib/email";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    beats?: number;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const beats = typeof body?.beats === "number" && body.beats > 0 ? body.beats : null;

  if (!email || !email.includes("@") || !beats) {
    return NextResponse.json({ error: "Email y latidos requeridos" }, { status: 400 });
  }

  const rl = checkRateLimit(`calc-email:${email}`, 3, 3_600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Demasiados envios" }, { status: 429 });
  }

  const appUrl = process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es";
  const heartbeatEmail = buildHeartbeatEmail({ to: email, beats, appUrl });

  const ok = await sendUserEmail({ ...heartbeatEmail, template: "heartbeat" });
  if (!ok) {
    logError("CALCULATOR", new Error("Failed to send heartbeat email"), { email });
    return NextResponse.json({ error: "No se pudo enviar" }, { status: 500 });
  }

  logInfo("CALCULATOR", "heartbeat_email_sent", { email, beats });
  return NextResponse.json({ ok: true });
}
