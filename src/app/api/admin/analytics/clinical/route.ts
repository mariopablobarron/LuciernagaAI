import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Métricas clínicas agregadas para evaluar si el producto está cumpliendo su
 * función pedagógica/clínica. Se exponen en /admin/analytics/clinical.
 *
 * Filosofía: cada métrica es un proxy honesto, no un dato perfecto. Las
 * limitaciones se documentan en cada cálculo para que el admin lea con
 * criterio.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  try {
    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? "30")));
    const prisma = getPrismaClient();
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const seven = 7 * 24 * 60 * 60 * 1000;

    // ── 1. Crisis containment ────────────────────────────────────────────
    // Proxy: una crisis se considera "contenida" si el mismo usuario NO tiene
    // otro CrisisEvent en los 7 días siguientes. No es certeza clínica — es
    // ausencia de re-escalada, que es el mejor proxy disponible sin telemetría
    // externa de psicólogo.
    const allCrisisInWindow = await prisma.crisisEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true, level: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    let crisisContained = 0;
    for (const event of allCrisisInWindow) {
      const sevenDaysAfter = new Date(event.createdAt.getTime() + seven);
      const followUp = allCrisisInWindow.find(
        (e) =>
          e.userId === event.userId &&
          e.createdAt > event.createdAt &&
          e.createdAt <= sevenDaysAfter,
      );
      if (!followUp) crisisContained += 1;
    }
    const crisisContainmentPct =
      allCrisisInWindow.length === 0
        ? null
        : Math.round((crisisContained / allCrisisInWindow.length) * 100);

    // ── 2. Avoidance → completion ────────────────────────────────────────
    // % de acciones que tuvieron al menos un AvoidanceEvent y posteriormente
    // se completaron. Mide "el confront del mentor consigue mover la acción".
    const avoidanceEvents = await prisma.avoidanceEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { actionId: true },
    });
    const avoidedActionIds = Array.from(new Set(avoidanceEvents.map((e) => e.actionId)));
    const avoidedActionsCompleted = avoidedActionIds.length === 0
      ? 0
      : await prisma.action.count({
          where: { id: { in: avoidedActionIds }, completed: true },
        });
    const avoidanceRecoveryPct =
      avoidedActionIds.length === 0
        ? null
        : Math.round((avoidedActionsCompleted / avoidedActionIds.length) * 100);

    // ── 3. Action completion rate ────────────────────────────────────────
    const actionsTotal = await prisma.action.count({
      where: { createdAt: { gte: since } },
    });
    const actionsCompleted = await prisma.action.count({
      where: { createdAt: { gte: since }, completed: true },
    });
    const actionCompletionPct =
      actionsTotal === 0 ? null : Math.round((actionsCompleted / actionsTotal) * 100);

    // ── 4. Mentor reflection approval ────────────────────────────────────
    // Humano-en-el-loop quality signal: % de reflexiones LLM que el admin
    // aprueba. Si baja mucho, el modelo está generando contenido off-tono y
    // hay que revisar el system prompt.
    const reflectionsTotal = await prisma.mentorReflection.count({
      where: { generatedAt: { gte: since } },
    });
    const reflectionsApproved = await prisma.mentorReflection.count({
      where: { generatedAt: { gte: since }, publishedAt: { not: null } },
    });
    const reflectionApprovalPct =
      reflectionsTotal === 0
        ? null
        : Math.round((reflectionsApproved / reflectionsTotal) * 100);

    // ── 5. Pattern → completion correlation ──────────────────────────────
    // Para cada dominantPattern, qué tasa de completion tienen sus acciones.
    // Identifica si el mentor sirve mejor a algunos perfiles emocionales.
    const usersWithPattern = await prisma.userState.findMany({
      select: { userId: true, dominantPattern: true },
    });
    const patternByUser = new Map(
      usersWithPattern.map((u) => [u.userId, u.dominantPattern]),
    );

    const recentActions = await prisma.action.findMany({
      where: { createdAt: { gte: since } },
      select: {
        completed: true,
        goal: { select: { userId: true } },
      },
    });

    const patternStats = new Map<string, { total: number; completed: number }>();
    for (const action of recentActions) {
      const pattern = patternByUser.get(action.goal.userId) ?? "unknown";
      let entry = patternStats.get(pattern);
      if (!entry) {
        entry = { total: 0, completed: 0 };
        patternStats.set(pattern, entry);
      }
      entry.total += 1;
      if (action.completed) entry.completed += 1;
    }

    const patternBreakdown = Array.from(patternStats.entries())
      .map(([pattern, stats]) => ({
        pattern,
        actionsTotal: stats.total,
        actionsCompleted: stats.completed,
        completionPct: stats.total === 0 ? null : Math.round((stats.completed / stats.total) * 100),
      }))
      .sort((a, b) => b.actionsTotal - a.actionsTotal);

    // ── 6. Goal lifecycle health ─────────────────────────────────────────
    const goalsCreated = await prisma.goal.count({
      where: { createdAt: { gte: since } },
    });
    const goalsCompleted = await prisma.goal.count({
      where: { updatedAt: { gte: since }, status: "completed" },
    });
    const goalsAbandoned = await prisma.goal.count({
      where: { updatedAt: { gte: since }, status: "abandoned" },
    });

    // ── 7. Crisis level distribution ─────────────────────────────────────
    const crisisByLevel: Record<string, number> = {};
    for (const event of allCrisisInWindow) {
      crisisByLevel[event.level] = (crisisByLevel[event.level] ?? 0) + 1;
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      windowDays: days,
      crisis: {
        eventsTotal: allCrisisInWindow.length,
        contained: crisisContained,
        containmentPct: crisisContainmentPct,
        byLevel: crisisByLevel,
        note:
          "Proxy: una crisis se considera contenida si el usuario NO tiene otra crisis en los 7 días siguientes. No equivale a certeza clínica.",
      },
      avoidance: {
        actionsAvoided: avoidedActionIds.length,
        actionsRecovered: avoidedActionsCompleted,
        recoveryPct: avoidanceRecoveryPct,
        note:
          "Mide si tras una evasión el confront del mentor consigue mover la acción a completed.",
      },
      actions: {
        total: actionsTotal,
        completed: actionsCompleted,
        completionPct: actionCompletionPct,
      },
      reflections: {
        total: reflectionsTotal,
        approved: reflectionsApproved,
        approvalPct: reflectionApprovalPct,
        note:
          "% de reflexiones del mentor que el admin aprueba. Baja sostenida = revisar system prompt.",
      },
      patternBreakdown,
      goals: {
        created: goalsCreated,
        completed: goalsCompleted,
        abandoned: goalsAbandoned,
      },
    });
  } catch (error) {
    logError("ADMIN_CLINICAL", error, { route: "/api/admin/analytics/clinical" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
