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

function parseDays(value: string | null): number {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 14;
  return Math.min(parsed, 90);
}

function parseSampleLimit(value: string | null): number {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, 20);
}

type SourceCount = { source: string; count: number };
type TopUser = { userId: string; count: number };
type CronEvent = { timestamp: string; level: string; message: string };

/**
 * GET /api/admin/semantic-memory-stats?[days=14][&recentSamples=10]
 *
 * Header: X-Admin-Secret (también acepta sesión admin habitual).
 *
 * Devuelve un snapshot del estado de la memoria semántica:
 * - totales por fuente, edad media, top usuarios
 * - log del cron embed-pending-memories en los últimos N días
 * - errores de retrieve/embed
 * - opcional: muestras recientes de turnos donde pastEchoes tuvo hits
 *   (cuando recentSamples > 0; revela contenido de SemanticMemory para
 *   evaluar calidad — solo accesible con admin secret)
 *
 * Tolera el caso "tabla no existe aún" (DEV antes de la migración) devolviendo
 * un payload con `available: false` en vez de 500.
 */
export const GET = withRateLimit(
  async function GET(req: NextRequest) {
    try {
      if (!hasValidAdminSecret(req)) {
        const adminAuth = requireAdminPermission(req, "users:emotional-history");
        if (adminAuth instanceof NextResponse) return adminAuth;
      }

      const url = new URL(req.url);
      const days = parseDays(url.searchParams.get("days"));
      const recentSamples = parseSampleLimit(url.searchParams.get("recentSamples"));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const prisma = getPrismaClient();

      // ── Stats principales (table SemanticMemory) ─────────────────────────
      let total = 0;
      let bySource: SourceCount[] = [];
      let avgAgeDays: number | null = null;
      let topUsers: TopUser[] = [];
      let tableAvailable = true;

      try {
        const [totalRow] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM "SemanticMemory"`,
        );
        total = Number(totalRow?.count ?? 0);

        bySource = await prisma.$queryRawUnsafe<SourceCount[]>(
          `SELECT "source", COUNT(*)::int AS count
           FROM "SemanticMemory"
           GROUP BY "source"
           ORDER BY count DESC`,
        );

        const [ageRow] = await prisma.$queryRawUnsafe<Array<{ avg_age_days: number | null }>>(
          `SELECT EXTRACT(EPOCH FROM (NOW() - AVG("createdAt"))) / 86400 AS avg_age_days
           FROM "SemanticMemory"`,
        );
        avgAgeDays = ageRow?.avg_age_days != null ? Number(Number(ageRow.avg_age_days).toFixed(1)) : null;

        topUsers = await prisma.$queryRawUnsafe<TopUser[]>(
          `SELECT "userId", COUNT(*)::int AS count
           FROM "SemanticMemory"
           GROUP BY "userId"
           ORDER BY count DESC
           LIMIT 10`,
        );
      } catch (err) {
        // Probablemente la migración aún no se aplicó. No es 500: devolvemos
        // available:false para que el agente revisor lo distinga del fallo.
        logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
          route: "/api/admin/semantic-memory-stats",
          stage: "table_query",
        });
        tableAvailable = false;
      }

      // ── Cron events + errores (SystemLog filtrado por tag) ───────────────
      const cronLogs = await prisma.systemLog.findMany({
        where: {
          tag: "SEMANTIC_MEMORY",
          timestamp: { gte: since },
        },
        select: { timestamp: true, level: true, message: true },
        orderBy: { timestamp: "desc" },
        take: 200,
      });

      const cronEvents: CronEvent[] = cronLogs.map((row) => ({
        timestamp: row.timestamp.toISOString(),
        level: row.level,
        message: row.message,
      }));

      const errorCount = cronEvents.filter((e) => e.level === "error").length;
      const insertedRows = cronEvents.filter((e) => e.message === "batch_inserted").length;

      // ── Muestras recientes (opt-in via ?recentSamples=N) ─────────────────
      let samples: Array<{
        id: string;
        userId: string;
        source: string;
        sourceId: string;
        contentExcerpt: string;
        createdAt: string;
      }> = [];

      if (tableAvailable && recentSamples > 0) {
        try {
          const rows = await prisma.$queryRawUnsafe<Array<{
            id: string;
            userId: string;
            source: string;
            sourceId: string;
            content: string;
            createdAt: Date;
          }>>(
            `SELECT "id", "userId", "source", "sourceId", "content", "createdAt"
             FROM "SemanticMemory"
             ORDER BY "createdAt" DESC
             LIMIT $1`,
            recentSamples,
          );
          samples = rows.map((r) => ({
            id: r.id,
            userId: r.userId,
            source: r.source,
            sourceId: r.sourceId,
            // Recortamos para no exponer entradas largas en el endpoint admin
            // sin necesidad. El revisor pide la fuente original si necesita más.
            contentExcerpt: r.content.length > 280 ? r.content.slice(0, 277) + "…" : r.content,
            createdAt: r.createdAt.toISOString(),
          }));
        } catch (err) {
          logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
            route: "/api/admin/semantic-memory-stats",
            stage: "samples_query",
          });
        }
      }

      return NextResponse.json({
        available: tableAvailable,
        windowDays: days,
        since: since.toISOString(),
        store: {
          total,
          bySource,
          avgAgeDays,
          topUsers,
        },
        cron: {
          windowEvents: cronEvents.length,
          errorCount,
          insertedBatches: insertedRows,
          recent: cronEvents.slice(0, 30),
        },
        samples,
        featureFlag: {
          enabled: process.env.SEMANTIC_MEMORY_ENABLED?.trim() === "true",
          openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
        },
      });
    } catch (err) {
      logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
        route: "/api/admin/semantic-memory-stats",
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { limit: 30 },
);
