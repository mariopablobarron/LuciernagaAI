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

type BackupContext = {
  filename?: string;
  sizeKb?: number;
  tables?: number;
  rows?: number;
  stage?: string;
};

/**
 * GET /api/admin/backup-status?[days=30]
 *
 * Header: X-Admin-Secret (también acepta sesión admin habitual).
 *
 * Lee SystemLog filtrado por tag="BACKUP" en los últimos N días.
 * Reporta:
 * - últimoÉxito (con filename, sizeKb, tables, rows)
 * - últimoFallo (con stage si lo registró)
 * - serie diaria de éxitos/fallos
 * - eventos recientes (top 30)
 *
 * Útil para confirmar que el cron diario de /api/admin/backup está
 * disparando, generando dump y entregándolo a Telegram, sin necesidad
 * del CRON_SECRET ni de mirar el chat manualmente.
 */
export const GET = withRateLimit(
  async function GET(req: NextRequest) {
    try {
      if (!hasValidAdminSecret(req)) {
        const adminAuth = requireAdminPermission(req, "backup");
        if (adminAuth instanceof NextResponse) return adminAuth;
      }

      const url = new URL(req.url);
      const daysParam = Number.parseInt(url.searchParams.get("days") ?? "30", 10);
      const days = Number.isFinite(daysParam) && daysParam > 0
        ? Math.min(daysParam, 90)
        : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const prisma = getPrismaClient();

      const rows = await prisma.systemLog.findMany({
        where: { tag: "BACKUP", timestamp: { gte: since } },
        select: {
          timestamp: true,
          level: true,
          message: true,
          context: true,
        },
        orderBy: { timestamp: "desc" },
        take: 1000,
      });

      // Última ejecución exitosa (`backup_created` con level=info)
      const lastSuccess = rows.find(
        (r) => r.level === "info" && r.message === "backup_created",
      ) ?? null;

      // Último fallo (level=error)
      const lastFailure = rows.find((r) => r.level === "error") ?? null;

      // Serie diaria: cuántos eventos por día y cuántos fallidos
      const dailyMap = new Map<string, { runs: number; failures: number }>();
      for (const r of rows) {
        const day = r.timestamp.toISOString().slice(0, 10);
        const cur = dailyMap.get(day) ?? { runs: 0, failures: 0 };
        cur.runs += 1;
        if (r.level === "error") cur.failures += 1;
        dailyMap.set(day, cur);
      }
      const daily = [...dailyMap.entries()]
        .map(([day, counts]) => ({ day, ...counts }))
        .sort((a, b) => (a.day < b.day ? 1 : -1));

      const successCount = rows.filter((r) => r.level === "info" && r.message === "backup_created").length;
      const failureCount = rows.filter((r) => r.level === "error").length;

      const lastSuccessCtx = (lastSuccess?.context ?? null) as BackupContext | null;
      const lastFailureCtx = (lastFailure?.context ?? null) as BackupContext | null;

      // Hace cuánto fue el último éxito (en horas)
      const lastSuccessAgeHours = lastSuccess
        ? Math.floor((Date.now() - lastSuccess.timestamp.getTime()) / (60 * 60 * 1000))
        : null;

      // Veredicto rápido
      let verdict: "ok" | "stale" | "failing" | "no_data";
      if (rows.length === 0) {
        verdict = "no_data";
      } else if (lastFailure && (!lastSuccess || lastFailure.timestamp > lastSuccess.timestamp)) {
        verdict = "failing";
      } else if (lastSuccessAgeHours !== null && lastSuccessAgeHours > 36) {
        // Cron diario debería correr cada 24h; si llevamos >36h sin éxito, algo va mal
        verdict = "stale";
      } else {
        verdict = "ok";
      }

      return NextResponse.json({
        windowDays: days,
        since: since.toISOString(),
        verdict,
        summary: {
          totalEvents: rows.length,
          successCount,
          failureCount,
          lastSuccessAt: lastSuccess?.timestamp.toISOString() ?? null,
          lastSuccessAgeHours,
          lastSuccessFilename: lastSuccessCtx?.filename ?? null,
          lastSuccessSizeKb: lastSuccessCtx?.sizeKb ?? null,
          lastSuccessTables: lastSuccessCtx?.tables ?? null,
          lastSuccessRows: lastSuccessCtx?.rows ?? null,
          lastFailureAt: lastFailure?.timestamp.toISOString() ?? null,
          lastFailureMessage: lastFailure?.message ?? null,
          lastFailureStage: lastFailureCtx?.stage ?? null,
        },
        daily,
        recent: rows.slice(0, 30).map((r) => ({
          timestamp: r.timestamp.toISOString(),
          level: r.level,
          message: r.message,
          context: r.context,
        })),
      });
    } catch (err) {
      logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
        route: "/api/admin/backup-status",
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { limit: 30 },
);
