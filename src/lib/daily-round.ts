import { DAILY_ROUND_PROMPTS } from "@/data/daily-round-prompts";

const TZ = "Europe/Madrid";

/**
 * Fecha del "hoy" visto desde Europe/Madrid, normalizada a medianoche UTC del
 * día local. DailyRound.date es @db.Date (sin hora), así que almacenar UTC
 * 00:00 de la fecha Madrid garantiza que un usuario en España siempre ve la
 * ronda correcta — incluso cuando UTC aún va un día atrás (01:00-02:00 local).
 */
export function todayInMadrid(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

/**
 * Rotación determinista por fecha: el mismo día siempre devuelve el mismo
 * prompt. Calcula días desde epoch y hace módulo con el tamaño del pool.
 */
export function pickPromptForDate(date: Date): string {
  const days = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const len = DAILY_ROUND_PROMPTS.length;
  const idx = ((days % len) + len) % len;
  return DAILY_ROUND_PROMPTS[idx] ?? DAILY_ROUND_PROMPTS[0]!;
}
