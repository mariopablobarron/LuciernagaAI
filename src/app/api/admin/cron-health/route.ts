import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function hasValidAdminSecret(req: NextRequest): boolean {
  const expected = process.env.ADMIN_AUTH_SECRET;
  if (!expected || expected.trim().length === 0) return false;
  const provided = req.headers.get("x-admin-secret");
  if (!provided) return false;
  return safeEqual(provided, expected);
}

// Lista de cron handlers conocidos (mantenida sincronizada con src/app/api/cron/*).
// Si añades un cron handler nuevo, añádelo aquí también para que aparezca en el
// health check con `lastRun: null` cuando aún no haya disparado nunca.
const KNOWN_CRONS = [
  "24h-nudge",
  "7d-nudge",
  "action-reminders",
  "admin-report",
  "backfill-activation",
  "capsule-deliver",
  "capsule-snapshot",
  "circle-matchmaking",
  "circle-pulses",
  "cron-watchdog",
  "daily-round-create",
  "db-backup-daily",
  "diag-migrations",
  "goal-avatar-midpoint",
  "inactivity-check",
  "llm-budget-alert",
  "poll-avatar-videos",
  "proactive-review",
  "purge-logs",
  "referral-30d-active",
  "reminders",
  "retention-hard-delete",
  "scan-pii",
  "scheduled-emails",
  "telegram-checkin",
  "user-weekly-review",
  "weekly-inactive-reminder",
  "weekly-letter",
  "weekly-letter-summary",
  "weekly-summary",
] as const;

// Crons confirmados como configurados en cron-job.org (según memoria del proyecto).
// Marcamos los demás como "expected:false" para que el operador sepa cuáles son
// huérfanos confirmados vs solo "no han disparado en la ventana".
const CONFIRMED_SCHEDULED = new Set([
  "referral-30d-active",
  "daily-round-create",
  "weekly-letter",
  "db-backup-daily", // antes "daily-backup", solo ping de salud
]);

/**
 * GET /api/admin/cron-health?[days=7]
 *
 * Header: X-Admin-Secret (también acepta sesión admin habitual).
 *
 * Para cada cron handler conocido devuelve:
 * - lastRunAt: timestamp de la última ejecución (null si nunca corrió)
 * - lastStatus: "completed" | "failed" | "running" | null
 * - runs7d: cuántas ejecuciones en los últimos `days` días
 * - errors7d: cuántas con status="failed" en la ventana
 * - confirmedScheduled: si está en la lista de crons confirmados
 *
 * El operador (humano) revisa: si un cron crítico (scheduled-emails,
 * reminders, telegram-checkin) tiene lastRunAt=null o muy antiguo,
 * está roto en producción.
 */
export const GET = withRateLimit(
  async function GET(req: NextRequest) {
    try {
      if (!hasValidAdminSecret(req)) {
        const adminAuth = requireAdminPermission(req, "users:emotional-history");
        if (adminAuth instanceof NextResponse) return adminAuth;
      }

      const url = new URL(req.url);
      const daysParam = Number.parseInt(url.searchParams.get("days") ?? "7", 10);
      const days = Number.isFinite(daysParam) && daysParam > 0
        ? Math.min(daysParam, 30)
        : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const prisma = getPrismaClient();

      // Última ejecución por jobName (incluso fuera de la ventana, para
      // detectar crons que no corren desde hace MUCHO).
      const lastRows = await prisma.$queryRawUnsafe<Array<{
        jobName: string;
        lastRunAt: Date;
        lastStatus: string;
      }>>(
        `SELECT DISTINCT ON ("jobName")
            "jobName",
            "startedAt" AS "lastRunAt",
            "status"    AS "lastStatus"
         FROM "CronRunLog"
         ORDER BY "jobName", "startedAt" DESC`,
      );
      const byName = new Map(lastRows.map((r) => [r.jobName, r]));

      // Conteos en ventana
      const windowRows = await prisma.cronRunLog.groupBy({
        by: ["jobName", "status"],
        where: { startedAt: { gte: since } },
        _count: true,
      });

      const runs7d: Record<string, number> = {};
      const errors7d: Record<string, number> = {};
      for (const row of windowRows) {
        const job = row.jobName;
        runs7d[job] = (runs7d[job] ?? 0) + row._count;
        if (row.status === "failed") {
          errors7d[job] = (errors7d[job] ?? 0) + row._count;
        }
      }

      // Componer respuesta — incluimos crons conocidos aunque nunca hayan corrido,
      // y también jobName de la BD que no estén en KNOWN_CRONS (defensivo: handlers
      // antiguos o crons añadidos sin actualizar la lista).
      const allJobNames = new Set<string>([
        ...KNOWN_CRONS,
        ...byName.keys(),
      ]);

      const now = Date.now();
      const jobs = [...allJobNames].sort().map((jobName) => {
        const last = byName.get(jobName);
        const lastRunAt = last?.lastRunAt ?? null;
        const ageHours = lastRunAt
          ? Math.floor((now - lastRunAt.getTime()) / (60 * 60 * 1000))
          : null;
        return {
          jobName,
          confirmedScheduled: CONFIRMED_SCHEDULED.has(jobName),
          knownHandler: (KNOWN_CRONS as readonly string[]).includes(jobName),
          lastRunAt: lastRunAt?.toISOString() ?? null,
          lastStatus: last?.lastStatus ?? null,
          ageHours,
          runs7d: runs7d[jobName] ?? 0,
          errors7d: errors7d[jobName] ?? 0,
        };
      });

      // Resumen rápido
      const summary = {
        windowDays: days,
        totalKnownHandlers: KNOWN_CRONS.length,
        confirmedScheduled: CONFIRMED_SCHEDULED.size,
        neverRan: jobs.filter((j) => j.knownHandler && j.lastRunAt === null).length,
        staleOver48h: jobs.filter((j) => j.knownHandler && j.ageHours !== null && j.ageHours > 48).length,
        anyErrorsInWindow: jobs.filter((j) => j.errors7d > 0).length,
      };

      return NextResponse.json({ summary, jobs });
    } catch (err) {
      logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
        route: "/api/admin/cron-health",
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { limit: 30 },
);
