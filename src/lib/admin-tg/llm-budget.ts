import { getPrismaClient } from "@/db/prisma";

const DEFAULT_BUDGET_USD = 200;

export type BudgetLevel = "ok" | "warn" | "critical";

export type LlmBudget = {
  monthlyUsd: number;
  spentMtdUsd: number;
  projectedMonthUsd: number;
  daysElapsed: number;
  daysInMonth: number;
  percentSpent: number;     // 0-100+
  percentProjected: number; // 0-100+
  level: BudgetLevel;
  alertReason?: "warn" | "critical" | null;
};

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function daysInMonthOf(d: Date): number {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

export async function calcLlmBudget(): Promise<LlmBudget> {
  const monthlyEnv = Number(process.env.LLM_MONTHLY_BUDGET_USD?.trim());
  const monthlyUsd = Number.isFinite(monthlyEnv) && monthlyEnv > 0 ? monthlyEnv : DEFAULT_BUDGET_USD;

  const prisma = getPrismaClient();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const daysInMonth = daysInMonthOf(now);
  // Día actual del mes (1-based). Antes del primer día completo asumimos 1 para no dividir entre 0.
  const dayOfMonth = now.getUTCDate();
  // Fracción de mes ya cubierta — usamos hora dentro del día para suavizar al inicio del mes
  const msInDay = 86_400_000;
  const elapsedDaysFractional = (now.getTime() - monthStart.getTime()) / msInDay;
  const daysElapsed = Math.max(elapsedDaysFractional, 1 / 24); // mínimo 1h para evitar proyecciones absurdas

  const spent = await prisma.llmLog.aggregate({
    where: { createdAt: { gte: monthStart } },
    _sum: { costUsd: true },
  });

  const spentMtdUsd = Math.max(0, spent._sum.costUsd ?? 0);
  const projectedMonthUsd = (spentMtdUsd / daysElapsed) * daysInMonth;

  const percentSpent = (spentMtdUsd / monthlyUsd) * 100;
  const percentProjected = (projectedMonthUsd / monthlyUsd) * 100;

  // level mira el peor entre real y proyección
  const peor = Math.max(percentSpent, percentProjected);
  let level: BudgetLevel = "ok";
  if (peor >= 100) level = "critical";
  else if (peor >= 70) level = "warn";

  const alertReason: BudgetLevel | null =
    percentSpent >= 100 ? "critical" :
    percentProjected >= 100 ? "critical" :
    percentProjected >= 70 ? "warn" :
    null;

  return {
    monthlyUsd,
    spentMtdUsd: Number(spentMtdUsd.toFixed(4)),
    projectedMonthUsd: Number(projectedMonthUsd.toFixed(2)),
    daysElapsed: Number(daysElapsed.toFixed(2)),
    daysInMonth,
    percentSpent: Number(percentSpent.toFixed(1)),
    percentProjected: Number(percentProjected.toFixed(1)),
    level,
    alertReason: alertReason as "warn" | "critical" | null,
  };
}

export function buildBudgetTelegramMessage(b: LlmBudget): string {
  const icon = b.alertReason === "critical" ? "🔴" : b.alertReason === "warn" ? "🟠" : "🟢";
  const titulo =
    b.alertReason === "critical" && b.spentMtdUsd >= b.monthlyUsd
      ? "Budget mensual SUPERADO"
      : b.alertReason === "critical"
        ? "Proyección mensual supera budget"
        : b.alertReason === "warn"
          ? "Proyección mensual cerca del budget"
          : "Budget LLM en orden";

  return [
    `${icon} *${titulo}*`,
    "",
    `Budget mensual: $${b.monthlyUsd.toFixed(2)}`,
    `Gastado MTD: *$${b.spentMtdUsd.toFixed(2)}* (${b.percentSpent.toFixed(0)}%)`,
    `Proyección mes: *$${b.projectedMonthUsd.toFixed(2)}* (${b.percentProjected.toFixed(0)}%)`,
    `Día ${Math.ceil(b.daysElapsed)} de ${b.daysInMonth}`,
    "",
    `Detalle: https://tresmilmillonesdelatidos.es/admin/llm-usage`,
  ].join("\n");
}
