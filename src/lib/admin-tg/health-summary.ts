import { getPrismaClient } from "@/db/prisma";

const fmt = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })
    : "—";

const ago = (d: Date | null | undefined) => {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};

export async function buildHealthMessage(): Promise<string> {
  const prisma = getPrismaClient();
  const now = Date.now();
  const since24h = new Date(now - 86_400_000);

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const [recentRuns, recentFailures, errorLogs, activeSubs, activeCrisis, signups24h, msgs24h] = await Promise.all([
    prisma.cronRunLog.findMany({
      where: { startedAt: { gte: since24h } },
      orderBy: { startedAt: "desc" },
      select: { jobName: true, status: true, startedAt: true },
    }),
    prisma.cronRunLog.findMany({
      where: { status: "failed", startedAt: { gte: since24h } },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { jobName: true, startedAt: true, errorMessage: true },
    }),
    prisma.systemLog
      .count({ where: { level: "error", timestamp: { gte: since24h } } })
      .catch(() => 0),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.userState.count({ where: { crisisActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: since24h } } }),
    prisma.message.count({ where: { createdAt: { gte: since24h }, role: "user" } }),
  ]);

  // Cron salud: agrupar por jobName, último run de cada uno
  const lastByJob = new Map<string, { status: string; startedAt: Date }>();
  for (const r of recentRuns) {
    if (!lastByJob.has(r.jobName)) lastByJob.set(r.jobName, { status: r.status, startedAt: r.startedAt });
  }
  const cronTotal = lastByJob.size;
  const cronOk = [...lastByJob.values()].filter((r) => r.status === "success").length;
  const cronFailed = [...lastByJob.values()].filter((r) => r.status === "failed").length;

  const overall = dbOk && cronFailed === 0 && errorLogs < 50 ? "✅" : cronFailed > 0 || !dbOk ? "❌" : "⚠️";

  const lines = [
    `${overall} *Salud — últimas 24h*`,
    "",
    `🗄️ Base de datos: ${dbOk ? "OK" : "❌ FALLO"}`,
    "",
    `⚙️ *Crons (último run de cada job, 24h):*`,
    `  Total jobs: ${cronTotal} · OK: ${cronOk} · Failed: ${cronFailed}`,
    ...(recentFailures.length > 0
      ? ["", `  Últimos fallos:`, ...recentFailures.map((f) => `  • \`${f.jobName}\` (${ago(f.startedAt)}): ${(f.errorMessage ?? "—").slice(0, 100)}`)]
      : []),
    "",
    `📋 SystemLog level=error (24h): ${errorLogs}`,
    "",
    `📊 *Negocio (24h):*`,
    `  Signups: ${signups24h}`,
    `  Mensajes user: ${msgs24h}`,
    `  Suscripciones activas: ${activeSubs}`,
    `  ${activeCrisis > 0 ? "🚨" : "🟢"} Crisis abiertas: ${activeCrisis}`,
  ];

  return lines.join("\n");
}
