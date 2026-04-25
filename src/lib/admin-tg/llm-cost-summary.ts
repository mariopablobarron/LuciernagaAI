import { getPrismaClient } from "@/db/prisma";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n));

async function aggregate(prisma: ReturnType<typeof getPrismaClient>, since: Date) {
  const [agg, byModel] = await Promise.all([
    prisma.llmLog.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, costUsd: true },
      _count: { _all: true },
    }),
    prisma.llmLog.groupBy({
      by: ["model"],
      where: { createdAt: { gte: since } },
      _sum: { costUsd: true, totalTokens: true },
      _count: { _all: true },
      orderBy: { _sum: { costUsd: "desc" } },
      take: 3,
    }),
  ]);

  return {
    requests: agg._count._all,
    tokens: agg._sum.totalTokens ?? 0,
    cost: agg._sum.costUsd ?? 0,
    topModels: byModel.map((m) => ({
      model: m.model,
      cost: m._sum.costUsd ?? 0,
      requests: m._count._all,
    })),
  };
}

export async function buildLlmCostMessage(): Promise<string> {
  const prisma = getPrismaClient();
  const now = Date.now();
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now - 7 * 86_400_000);
  const monthStart = new Date(now - 30 * 86_400_000);

  const [today, week, month] = await Promise.all([
    aggregate(prisma, todayStart),
    aggregate(prisma, weekStart),
    aggregate(prisma, monthStart),
  ]);

  const lines = [
    `💸 *Gasto LLM*`,
    "",
    `*Hoy:* ${fmtUsd(today.cost)} · ${today.requests} reqs · ${fmtTokens(today.tokens)} tok`,
    `*7 días:* ${fmtUsd(week.cost)} · ${week.requests} reqs · ${fmtTokens(week.tokens)} tok`,
    `*30 días:* ${fmtUsd(month.cost)} · ${month.requests} reqs · ${fmtTokens(month.tokens)} tok`,
    "",
    `*Top modelos (30d):*`,
    ...month.topModels.map((m) => `  • \`${m.model}\` — ${fmtUsd(m.cost)} (${m.requests} reqs)`),
  ];

  if (month.topModels.length === 0) lines.push("  (sin actividad LLM en 30 días)");

  return lines.join("\n");
}
