import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Aha moment definition (persisted, not recomputed):
 *   - activatedAt is set by services/activation.ts when the user reaches
 *     ≥3 user messages AND has completed ≥1 action.
 *   - Retroactive population for existing rows: /api/cron/backfill-activation.
 *
 * This endpoint now reads the flag directly. No more per-request O(users·msgs)
 * scans, and the 12-week cap is lifted (pass ?weeks=24 or ?weeks=all).
 */

const AHA_MESSAGES_REQUIRED = 3;
const AHA_WINDOW_HOURS = 72;
const DEFAULT_WEEKS = 12;

type CohortRow = {
  week: string;
  totalUsers: number;
  eligible: number;
  activated: number;
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
    const weeks = allTime ? null : Math.max(1, Math.min(104, Number(weeksParam) || DEFAULT_WEEKS));

    const prisma = getPrismaClient();
    const now = Date.now();
    const cutoff = weeks === null ? null : new Date(now - weeks * 7 * 86400_000);

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
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
        definition: {
          window_hours: AHA_WINDOW_HOURS,
          messages_required: AHA_MESSAGES_REQUIRED,
          needs_action_completed: true,
          description: `${AHA_MESSAGES_REQUIRED} mensajes + al menos 1 acción completada`,
          persisted: true,
        },
        cohorts: [],
        overall: { eligible: 0, activated: 0, rate: null },
        totalUsers: 0,
        range: allTime ? "all" : `${weeks}w`,
      });
    }

    const userIds = users.map((u) => u.id);

    // Users with ≥1 completed action — needed to compute the "action-only"
    // breakdown (the flag we already use identifies users that met *both*
    // conditions).
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

    for (const [week, cohortUsers] of cohortMap) {
      let eligible = 0;
      let activated = 0;
      let messagesOnly = 0;
      let actionOnly = 0;

      for (const u of cohortUsers) {
        // Eligible = enough time has passed since signup to realistically
        // reach the threshold. Keeps the metric honest for recent signups.
        const eligibleAt = u.createdAt.getTime() + AHA_WINDOW_HOURS * 3600_000;
        if (now < eligibleAt) continue;
        eligible++;

        if (u.activatedAt) {
          activated++;
          continue;
        }
        const reachedMessages = u.messageCount >= AHA_MESSAGES_REQUIRED;
        const hasAction = withCompletedAction.has(u.id);
        if (reachedMessages) messagesOnly++;
        else if (hasAction) actionOnly++;
      }

      cohorts.push({
        week,
        totalUsers: cohortUsers.length,
        eligible,
        activated,
        rate: eligible > 0 ? activated / eligible : null,
        messagesReachedOnly: messagesOnly,
        actionCompletedOnly: actionOnly,
      });

      overallEligible += eligible;
      overallActivated += activated;
    }

    cohorts.sort((a, b) => b.week.localeCompare(a.week));

    return NextResponse.json({
      definition: {
        window_hours: AHA_WINDOW_HOURS,
        messages_required: AHA_MESSAGES_REQUIRED,
        needs_action_completed: true,
        description: `${AHA_MESSAGES_REQUIRED} mensajes + al menos 1 acción completada`,
        persisted: true,
      },
      cohorts,
      overall: {
        eligible: overallEligible,
        activated: overallActivated,
        rate: overallEligible > 0 ? overallActivated / overallEligible : null,
      },
      totalUsers: users.length,
      range: allTime ? "all" : `${weeks}w`,
    });
  } catch (error) {
    logError("ANALYTICS_ACTIVATION", error, { action: "get_activation" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
