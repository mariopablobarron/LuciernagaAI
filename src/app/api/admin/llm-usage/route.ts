import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCost(usd: number | null): number {
  return Math.round((usd ?? 0) * 1_000_000) / 1_000_000; // 6 decimales
}

type EfficiencyFlag = {
  source: string;
  issue: string;
  detail: string;
};

function buildRecommendations(
  bySource: Array<{
    source: string;
    requests: number;
    avgPromptTokens: number;
    avgCompletionTokens: number;
    avgTotalTokens: number;
  }>
): EfficiencyFlag[] {
  const flags: EfficiencyFlag[] = [];

  for (const s of bySource) {
    if (s.requests < 5) continue; // muestra insuficiente

    const ratio =
      s.avgPromptTokens > 0 ? s.avgCompletionTokens / s.avgPromptTokens : 0;

    // Prompt muy pesado respecto a la respuesta
    if (ratio < 0.15 && s.avgPromptTokens > 200) {
      flags.push({
        source: s.source,
        issue: "prompt_overhead",
        detail: `El prompt es ${Math.round(1 / ratio)}× más largo que la respuesta media (${Math.round(s.avgPromptTokens)} → ${Math.round(s.avgCompletionTokens)} tok). Considera reducir el system prompt o el historial enviado.`,
      });
    }

    // Respuesta anormalmente larga (posible max_tokens demasiado alto)
    if (s.avgCompletionTokens > 400) {
      flags.push({
        source: s.source,
        issue: "long_completion",
        detail: `Respuesta media de ${Math.round(s.avgCompletionTokens)} tokens. Revisa si max_tokens está calibrado para este source.`,
      });
    }

    // Total por llamada muy alto
    if (s.avgTotalTokens > 1500) {
      flags.push({
        source: s.source,
        issue: "high_total",
        detail: `Media de ${Math.round(s.avgTotalTokens)} tokens/llamada. Considera comprimir el historial o usar un modelo más barato para este source.`,
      });
    }
  }

  return flags;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "llm-usage");
  if (auth instanceof NextResponse) return auth;

  try {
    const db = getPrismaClient();
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      summary7d,
      summary30d,
      summaryAll,
      byModel,
      bySourceRaw,
      topConsumersRaw,
      latestLogs,
    ] = await Promise.all([
      // ── Resúmenes temporales ────────────────────────────────────────────────
      db.llmLog.aggregate({
        where: { createdAt: { gte: since7d } },
        _count: { id: true },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true, costUsd: true },
        _avg: { latencyMs: true },
      }),
      db.llmLog.aggregate({
        where: { createdAt: { gte: since30d } },
        _count: { id: true },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true, costUsd: true },
        _avg: { latencyMs: true },
      }),
      db.llmLog.aggregate({
        _count: { id: true },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true, costUsd: true },
        _avg: { latencyMs: true },
      }),

      // ── Por modelo ─────────────────────────────────────────────────────────
      db.llmLog.groupBy({
        by: ["model"],
        _count: { id: true },
        _sum: { totalTokens: true, costUsd: true },
        _avg: { latencyMs: true },
        orderBy: { _sum: { totalTokens: "desc" } },
      }),

      // ── Por source (para eficiencia de prompts) ────────────────────────────
      db.llmLog.groupBy({
        by: ["source"],
        _count: { id: true },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true, costUsd: true },
        _avg: { totalTokens: true, promptTokens: true, completionTokens: true, latencyMs: true },
        orderBy: { _sum: { totalTokens: "desc" } },
      }),

      // ── Top consumers (usuarios con más tokens) ────────────────────────────
      db.llmLog.groupBy({
        by: ["userId"],
        where: { userId: { not: null } },
        _count: { id: true },
        _sum: { totalTokens: true, costUsd: true },
        _avg: { totalTokens: true, latencyMs: true },
        orderBy: { _sum: { totalTokens: "desc" } },
        take: 20,
      }),

      // ── Últimos logs ───────────────────────────────────────────────────────
      db.llmLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          userId: true,
          model: true,
          source: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          costUsd: true,
          latencyMs: true,
          createdAt: true,
          prompt: true,
          response: true,
        },
      }),
    ]);

    // ── Enriquecer topConsumers con email ───────────────────────────────────
    const consumerUserIds = topConsumersRaw
      .map((r) => r.userId)
      .filter((id): id is string => id !== null);

    const users = await db.user.findMany({
      where: { id: { in: consumerUserIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // ── Construir eficiencia por source ─────────────────────────────────────
    const bySource = bySourceRaw.map((s) => ({
      source: s.source,
      requests: s._count.id,
      totalTokens: s._sum.totalTokens ?? 0,
      promptTokens: s._sum.promptTokens ?? 0,
      completionTokens: s._sum.completionTokens ?? 0,
      costUsd: formatCost(s._sum.costUsd),
      avgPromptTokens: Math.round(s._avg.promptTokens ?? 0),
      avgCompletionTokens: Math.round(s._avg.completionTokens ?? 0),
      avgTotalTokens: Math.round(s._avg.totalTokens ?? 0),
      avgLatencyMs: Math.round(s._avg.latencyMs ?? 0),
      // ratio < 1 = prompt pesa más que la respuesta (típico y aceptable)
      // ratio muy bajo = ineficiencia
      efficiencyRatio:
        (s._avg.promptTokens ?? 0) > 0
          ? Math.round(((s._avg.completionTokens ?? 0) / (s._avg.promptTokens ?? 1)) * 100) / 100
          : null,
    }));

    const recommendations = buildRecommendations(bySource);

    return NextResponse.json({
      summary: {
        last7d: {
          requests: summary7d._count.id,
          totalTokens: summary7d._sum.totalTokens ?? 0,
          promptTokens: summary7d._sum.promptTokens ?? 0,
          completionTokens: summary7d._sum.completionTokens ?? 0,
          costUsd: formatCost(summary7d._sum.costUsd),
          avgLatencyMs: Math.round(summary7d._avg.latencyMs ?? 0),
        },
        last30d: {
          requests: summary30d._count.id,
          totalTokens: summary30d._sum.totalTokens ?? 0,
          promptTokens: summary30d._sum.promptTokens ?? 0,
          completionTokens: summary30d._sum.completionTokens ?? 0,
          costUsd: formatCost(summary30d._sum.costUsd),
          avgLatencyMs: Math.round(summary30d._avg.latencyMs ?? 0),
        },
        allTime: {
          requests: summaryAll._count.id,
          totalTokens: summaryAll._sum.totalTokens ?? 0,
          promptTokens: summaryAll._sum.promptTokens ?? 0,
          completionTokens: summaryAll._sum.completionTokens ?? 0,
          costUsd: formatCost(summaryAll._sum.costUsd),
          avgLatencyMs: Math.round(summaryAll._avg.latencyMs ?? 0),
        },
      },
      byModel: byModel.map((r) => ({
        model: r.model,
        requests: r._count.id,
        totalTokens: r._sum.totalTokens ?? 0,
        costUsd: formatCost(r._sum.costUsd),
        avgLatencyMs: Math.round(r._avg.latencyMs ?? 0),
      })),
      bySource,
      topConsumers: topConsumersRaw.map((r) => {
        const user = r.userId ? userMap.get(r.userId) : undefined;
        return {
          userId: r.userId,
          email: user?.email ?? null,
          name: user?.name ?? null,
          requests: r._count.id,
          totalTokens: r._sum.totalTokens ?? 0,
          costUsd: formatCost(r._sum.costUsd),
          avgTokensPerRequest: Math.round(r._avg.totalTokens ?? 0),
        };
      }),
      recommendations,
      latestLogs: latestLogs.map((l) => ({
        ...l,
        costUsd: formatCost(l.costUsd),
        prompt: l.prompt.slice(0, 200),
        response: l.response.slice(0, 200),
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    logError("ADMIN", err, { area: "llm-usage" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
