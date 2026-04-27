import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { buildInternalUserExclusion, shouldExcludeInternal } from "@/lib/internal-users";
import {
  ACTIVATION_ELIGIBILITY_WAIT_HOURS,
  ACTIVATION_RULE,
} from "@/services/activation";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Aha moment cohort report. Reads the persisted `User.activatedAt` flag set by
 * services/activation.ts (do not recompute the rule here — see ACTIVATION_RULE).
 *
 * The 72h figure is *eligibility*, not part of the rule: cohort members younger
 * than 72h are excluded from the denominator so we don't count them as
 * "did not activate" before they had a fair chance. The new
 * `activatedWithin72h` column gives an explicit speed-of-activation signal.
 */

const DEFAULT_WEEKS = 12;
const ELIGIBILITY_MS = ACTIVATION_ELIGIBILITY_WAIT_HOURS * 3600_000;

type CohortRow = {
  week: string;
  totalUsers: number;
  eligible: number;
  activated: number;
  activatedWithin72h: number;
  rate: number | null;
  messagesReachedOnly: number;
  actionCompletedOnly: number;
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdminPermission(req, "analytics");
    if (auth instanceof NextResponse) return auth;

    const weeksParam = req.nextUrl.searchParams.get("weeks");
    const allTime = weeksParam === "all";
    const weeks = allTime
      ? null
      : Math.max(1, Math.min(104, Number(weeksParam) || DEFAULT_WEEKS));

    const prisma = getPrismaClient();
    const now = Date.now();
    const cutoff = weeks === null ? null : new Date(now - weeks * 7 * 86400_000);

    const excludeInternal = shouldExcludeInternal(req);
    const userIdFilter = await buildInternalUserExclusion({ excludeInternal });

    const definition = {
      // Kept for backwards-compat with the dashboard UI. Semantically this is
      // the *eligibility wait*, not part of the rule. Use eligibility_wait_hours
      // in new clients.
      window_hours: ACTIVATION_ELIGIBILITY_WAIT_HOURS,
      eligibility_wait_hours: ACTIVATION_ELIGIBILITY_WAIT_HOURS,
      rule_window_hours: ACTIVATION_RULE.timeWindowHours, // null → "no time bound"
      messages_required: ACTIVATION_RULE.minUserMessages,
      needs_action_completed: ACTIVATION_RULE.needsCompletedAction,
      description: `${ACTIVATION_RULE.minUserMessages} mensajes y ≥1 acción completada (sin ventana temporal en la regla; elegibilidad: >${ACTIVATION_ELIGIBILITY_WAIT_HOURS}h desde signup).`,
      persisted: true,
    } as const;

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
        ...(userIdFilter ? { id: userIdFilter } : {}),
      },
      select: {
        id: true,
        createdAt: true,
        messageCount: true,
        activatedAt: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json({
        definition,
        cohorts: [],
        overall: {
          eligible: 0,
          activated: 0,
          activatedWithin72h: 0,
          rate: null,
        },
        totalUsers: 0,
        range: allTime ? "all" : `${weeks}w`,
      });
    }

    const userIds = users.map((u) => u.id);

    // Users with ≥1 completed action — needed for the "action-only" breakdown
    // (the persisted flag identifies users that met *both* conditions).
    const completedActionRows = await prisma.action.findMany({
      where: { completed: true, goal: { userId: { in: userIds } } },
      select: { goal: { select: { userId: true } } },
    });
    const withCompletedAction = new Set<string>();
    for (const a of completedActionRows) {
      if (a.goal.userId) withCompletedAction.add(a.goal.userId);
    }

    const cohortMap = new Map<string, typeof users>();
    for (const u of users) {
      const week = startOfWeek(u.createdAt).toISOString().slice(0, 10);
      const list = cohortMap.get(week) ?? [];
      list.push(u);
      cohortMap.set(week, list);
    }

    const cohorts: CohortRow[] = [];
    let overallEligible = 0;
    let overallActivated = 0;
    let overallActivatedWithin72h = 0;

    for (const [week, cohortUsers] of cohortMap) {
      let eligible = 0;
      let activated = 0;
      let activatedWithin72h = 0;
      let messagesOnly = 0;
      let actionOnly = 0;

      for (const u of cohortUsers) {
        const eligibleAt = u.createdAt.getTime() + ELIGIBILITY_MS;
        if (now < eligibleAt) continue;
        eligible++;

        if (u.activatedAt) {
          activated++;
          const tta = u.activatedAt.getTime() - u.createdAt.getTime();
          if (tta <= ELIGIBILITY_MS) activatedWithin72h++;
          continue;
        }
        const reachedMessages = u.messageCount >= ACTIVATION_RULE.minUserMessages;
        const hasAction = withCompletedAction.has(u.id);
        if (reachedMessages) messagesOnly++;
        else if (hasAction) actionOnly++;
      }

      cohorts.push({
        week,
        totalUsers: cohortUsers.length,
        eligible,
        activated,
        activatedWithin72h,
        rate: eligible > 0 ? activated / eligible : null,
        messagesReachedOnly: messagesOnly,
        actionCompletedOnly: actionOnly,
      });

      overallEligible += eligible;
      overallActivated += activated;
      overallActivatedWithin72h += activatedWithin72h;
    }

    cohorts.sort((a, b) => b.week.localeCompare(a.week));

    return NextResponse.json({
      definition,
      cohorts,
      overall: {
        eligible: overallEligible,
        activated: overallActivated,
        activatedWithin72h: overallActivatedWithin72h,
        rate: overallEligible > 0 ? overallActivated / overallEligible : null,
      },
      totalUsers: users.length,
      range: allTime ? "all" : `${weeks}w`,
      meta: {
        excludeInternal,
        internalUserCount: userIdFilter?.notIn.length ?? 0,
      },
    });
  } catch (error) {
    logError("ANALYTICS_ACTIVATION", error, { action: "get_activation" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
