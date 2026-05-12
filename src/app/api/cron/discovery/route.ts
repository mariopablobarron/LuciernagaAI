import { type NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { runDiscoveryCycle } from "@/services/discovery";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/discovery
 *
 * Ejecuta un ciclo de discovery: busca conversaciones en Reddit,
 * las puntúa con LLM, genera borradores y notifica a Telegram las
 * mejores. Programado cada 4-6h en el VPS crontab.
 *
 * Solo encuentra y prepara — Mario aprueba en /admin/distribution.
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await runDiscoveryCycle();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    logError("DISCOVERY", error, { stage: "cron_entry" });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
