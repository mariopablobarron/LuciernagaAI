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

type ShadowContext = {
  keywordEmotion?: string;
  nlpRawLabel?: string;
  nlpRawScore?: number;
  nlpMapped?: string | null;
  agree?: boolean;
};

function parseDays(value: string | null): number {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.min(parsed, 30);
}

function bumpCount(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export const GET = withRateLimit(
  async function GET(req: NextRequest) {
    try {
      // Aceptar X-Admin-Secret (para agentes remotos sin sesión) como vía
      // alternativa a la auth de admin habitual. Mismo patrón que /api/admin/routines.
      if (!hasValidAdminSecret(req)) {
        const adminAuth = requireAdminPermission(req, "users:emotional-history");
        if (adminAuth instanceof NextResponse) return adminAuth;
      }

      const url = new URL(req.url);
      const days = parseDays(url.searchParams.get("days"));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const prisma = getPrismaClient();
      const rows = await prisma.systemLog.findMany({
        where: {
          tag: "EMOTION_NLP",
          message: "shadow_compare",
          timestamp: { gte: since },
        },
        select: { context: true, timestamp: true },
        orderBy: { timestamp: "desc" },
        take: 5000,
      });

      let total = 0;
      let agreeCount = 0;
      let scoreSum = 0;
      let scoreSamples = 0;
      const byKeyword: Record<string, number> = {};
      const byNlpRawLabel: Record<string, number> = {};
      const byNlpMapped: Record<string, number> = {};
      const confusion: Record<string, Record<string, number>> = {};
      const disagreementsByKeyword: Record<string, number> = {};

      for (const row of rows) {
        const ctx = (row.context ?? null) as ShadowContext | null;
        if (!ctx || typeof ctx !== "object") continue;

        const keyword = ctx.keywordEmotion ?? "unknown";
        const rawLabel = ctx.nlpRawLabel ?? "unknown";
        const mapped = ctx.nlpMapped ?? "none";
        const agree = ctx.agree === true;

        total += 1;
        if (agree) agreeCount += 1;

        if (typeof ctx.nlpRawScore === "number") {
          scoreSum += ctx.nlpRawScore;
          scoreSamples += 1;
        }

        bumpCount(byKeyword, keyword);
        bumpCount(byNlpRawLabel, rawLabel);
        bumpCount(byNlpMapped, mapped);

        confusion[keyword] ??= {};
        bumpCount(confusion[keyword], mapped);

        if (!agree) {
          bumpCount(disagreementsByKeyword, keyword);
        }
      }

      const sortDesc = (record: Record<string, number>) =>
        Object.entries(record)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);

      return NextResponse.json({
        windowDays: days,
        since: since.toISOString(),
        sampleSize: total,
        agreementRate: total > 0 ? Number((agreeCount / total).toFixed(3)) : null,
        avgNlpScore: scoreSamples > 0 ? Number((scoreSum / scoreSamples).toFixed(3)) : null,
        byKeywordEmotion: sortDesc(byKeyword),
        byNlpRawLabel: sortDesc(byNlpRawLabel),
        byNlpMapped: sortDesc(byNlpMapped),
        disagreementsByKeyword: sortDesc(disagreementsByKeyword),
        confusion,
      });
    } catch (err) {
      logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
        route: "/api/admin/emotion-nlp-stats",
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { limit: 30 }
);
