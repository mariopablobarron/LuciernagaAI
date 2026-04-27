import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { todayInMadrid, pickPromptForDate } from "@/lib/daily-round";
import { requireCronSecret } from "@/lib/cron-auth";

// GET /api/cron/daily-round-create?secret=CRON_SECRET
// Idempotente: crea la ronda de hoy solo si no existe.
// Programar diariamente ~00:05 (zona Madrid). Rotación determinista por fecha
// para que el mismo día siempre devuelva el mismo prompt.
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const prisma = getPrismaClient();
    const today = todayInMadrid();

    const existing = await prisma.dailyRound.findUnique({ where: { date: today } });
    if (existing) {
      return NextResponse.json({ ok: true, skipped: true, id: existing.id });
    }

    const prompt = pickPromptForDate(today);
    const round = await prisma.dailyRound.create({
      data: { date: today, prompt },
    });

    logInfo("CRON", "daily_round_created", { id: round.id, date: today.toISOString().slice(0, 10) });
    return NextResponse.json({ ok: true, id: round.id, prompt });
  } catch (error) {
    logError("CRON", error, { action: "daily_round_create_failed" });
    sendAutomatedAlert({
      type: "critical",
      title: "Cron falló: daily-round-create",
      message: error instanceof Error ? error.message : "Error desconocido",
    }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

