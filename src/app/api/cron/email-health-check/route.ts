import { type NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { checkResendDomainHealth } from "@/lib/email-health";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/email-health-check
 *
 * Verifica que el dominio Resend esté completamente verificado.
 * Si no lo está, intenta re-verificar automáticamente y alerta por Telegram.
 * Programado cada 6h en el VPS crontab.
 *
 * Responde { ok: true, status, domainName } o
 *           { ok: false, status, domainName, failingRecords, alerted }
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await checkResendDomainHealth();
    return NextResponse.json(result, { status: result.ok ? 200 : 200 }); // siempre 200 para crons
  } catch (error) {
    logError("EMAIL_HEALTH", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
