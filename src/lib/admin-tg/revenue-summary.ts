import { getPrismaClient } from "@/db/prisma";
import { pricePointsToMrr } from "@/lib/billing";

export async function buildRevenueMessage(): Promise<string> {
  const prisma = getPrismaClient();
  const now = Date.now();
  const sinceWeek = new Date(now - 7 * 86_400_000);
  const sinceMonth = new Date(now - 30 * 86_400_000);

  const [active, newWeek, churnedWeek, churnedMonth, byPlan] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "active" },
      select: { plan: true, stripePriceId: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
    prisma.subscription.count({
      where: { status: "active", createdAt: { gte: sinceWeek } },
    }),
    prisma.subscription.count({
      where: { status: "canceled", cancelledAt: { gte: sinceWeek } },
    }),
    prisma.subscription.count({
      where: { status: "canceled", cancelledAt: { gte: sinceMonth } },
    }),
    prisma.subscription.groupBy({
      by: ["plan"],
      where: { status: "active" },
      _count: { _all: true },
    }),
  ]);

  const mrrUsd = active.reduce((sum, s) => sum + pricePointsToMrr(s.stripePriceId), 0);
  const cancellingNow = active.filter((s) => s.cancelAtPeriodEnd).length;

  const lines = [
    `💰 *Ingresos*`,
    "",
    `MRR estimado: *$${mrrUsd.toFixed(2)}* (USD aprox)`,
    `Suscripciones activas: ${active.length}`,
    cancellingNow > 0 ? `⚠️ Cancelan al final del período: ${cancellingNow}` : null,
    "",
    `*Últimos 7 días:*`,
    `  Nuevas: ${newWeek}`,
    `  Cancelaciones: ${churnedWeek}`,
    "",
    `*Últimos 30 días:*`,
    `  Cancelaciones: ${churnedMonth}`,
    "",
    `*Por plan (activas):*`,
    ...byPlan.map((p) => `  • ${p.plan}: ${p._count._all}`),
  ].filter(Boolean);

  if (byPlan.length === 0) lines.push("  (sin suscripciones activas)");

  return lines.join("\n");
}
