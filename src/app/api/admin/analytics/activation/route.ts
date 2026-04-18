import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Aha moment definition:
 *   - ≥3 mensajes del usuario en las primeras 72h desde signup
 *   - Y al menos 1 acción completada en cualquier momento posterior al signup
 *
 * Se calcula por cohorte semanal (últimas 12 semanas). Usuarios con menos de
 * 3 días desde el signup aún no son elegibles para la ventana de mensajes.
 */

const AHA_MESSAGES_REQUIRED = 3;
const AHA_WINDOW_HOURS = 72;

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

    const prisma = getPrismaClient();
    const now = Date.now();
    const twelveWeeksAgo = new Date(now - 12 * 7 * 86400_000);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: twelveWeeksAgo } },
      select: { id: true, createdAt: true },
    });

    if (users.length === 0) {
      return NextResponse.json({
        definition: {
          window_hours: AHA_WINDOW_HOURS,
          messages_required: AHA_MESSAGES_REQUIRED,
          needs_action_completed: true,
        },
        cohorts: [],
        overall: { eligible: 0, activated: 0, rate: null },
        totalUsers: 0,
      });
    }

    const userIds = users.map((u) => u.id);

    const [messages, completedActions] = await Promise.all([
      prisma.message.findMany({
        where: {
          userId: { in: userIds },
          role: "user",
          createdAt: { gte: twelveWeeksAgo },
        },
        select: { userId: true, createdAt: true },
      }),
      prisma.action.findMany({
        where: { completed: true, goal: { userId: { in: userIds } } },
        select: { goal: { select: { userId: true } } },
      }),
    ]);

    const messageCountInWindow = new Map<string, number>();
    for (const user of users) {
      const windowEnd = user.createdAt.getTime() + AHA_WINDOW_HOURS * 3600_000;
      messageCountInWindow.set(user.id, 0);
      void windowEnd;
    }
    const userSignup = new Map(users.map((u) => [u.id, u.createdAt.getTime()]));

    for (const msg of messages) {
      if (!msg.userId) continue;
      const signupMs = userSignup.get(msg.userId);
      if (signupMs === undefined) continue;
      const windowEnd = signupMs + AHA_WINDOW_HOURS * 3600_000;
      const t = msg.createdAt.getTime();
      if (t >= signupMs && t <= windowEnd) {
        messageCountInWindow.set(msg.userId, (messageCountInWindow.get(msg.userId) ?? 0) + 1);
      }
    }

    const usersWithCompletedAction = new Set<string>();
    for (const a of completedActions) {
      if (a.goal.userId) usersWithCompletedAction.add(a.goal.userId);
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
        // Elegible = al menos AHA_WINDOW_HOURS han pasado desde su signup
        const eligibleAt = u.createdAt.getTime() + AHA_WINDOW_HOURS * 3600_000;
        if (now < eligibleAt) continue;
        eligible++;

        const msgs = messageCountInWindow.get(u.id) ?? 0;
        const reachedMessages = msgs >= AHA_MESSAGES_REQUIRED;
        const hasAction = usersWithCompletedAction.has(u.id);

        if (reachedMessages && hasAction) activated++;
        else if (reachedMessages) messagesOnly++;
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
        description: `${AHA_MESSAGES_REQUIRED} mensajes en ${AHA_WINDOW_HOURS / 24} días + al menos 1 acción completada`,
      },
      cohorts,
      overall: {
        eligible: overallEligible,
        activated: overallActivated,
        rate: overallEligible > 0 ? overallActivated / overallEligible : null,
      },
      totalUsers: users.length,
    });
  } catch (error) {
    logError("ANALYTICS_ACTIVATION", error, { action: "get_activation" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
