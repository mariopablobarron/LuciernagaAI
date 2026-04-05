import { getPrismaClient } from "@/db/prisma";
import type {
  ClinicalUserListItem,
  ClinicalUserDetail,
  EmotionalState,
  InterventionStatus,
  InterventionType,
  RiskLevel,
} from "./types";

const MESSAGES_LIMIT = 50;
const CRISIS_LIMIT = 20;
const INTERVENTIONS_LIMIT = 30;

export async function getClinicalUserList(opts: {
  riskOnly: boolean;
  state: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ClinicalUserListItem[]; total: number }> {
  const prisma = getPrismaClient();
  const { riskOnly, state, page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  // Resolve userIds from state/risk filters
  let filteredIds: string[] | null = null;
  if (riskOnly || state !== "all") {
    const where: Record<string, unknown> = {};
    if (state !== "all") where.state = state;
    if (riskOnly) where.OR = [{ riskLevel: "high" }, { riskLevel: "critical" }, { crisisActive: true }];

    const rows = await prisma.userState.findMany({ where, select: { userId: true } });
    filteredIds = rows.map((r) => r.userId);
    if (filteredIds.length === 0) return { items: [], total: 0 };
  }

  const userWhere = filteredIds ? { id: { in: filteredIds } } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: [{ lastSeen: "desc" }],
      skip,
      take: pageSize,
      select: { id: true, email: true, name: true, lastSeen: true },
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  if (users.length === 0) return { items: [], total };

  const ids = users.map((u) => u.id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [states, streaks, crisis7d, interventionCounts, lastInterventions] = await Promise.all([
    prisma.userState.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, state: true, riskLevel: true, crisisActive: true },
    }),
    prisma.streak.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, currentDays: true },
    }),
    prisma.crisisEvent.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.intervention.groupBy({
      by: ["userId"],
      where: { userId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.intervention.findMany({
      where: { userId: { in: ids } },
      orderBy: { sentAt: "desc" },
      select: { userId: true, sentAt: true },
      distinct: ["userId"],
    }),
  ]);

  const stateMap = new Map(states.map((s) => [s.userId, s]));
  const streakMap = new Map(streaks.map((s) => [s.userId, s.currentDays]));
  const crisis7dMap = new Map(crisis7d.map((c) => [c.userId, c._count._all]));
  const interventionCountMap = new Map(interventionCounts.map((i) => [i.userId, i._count._all]));
  const lastInterventionMap = new Map(lastInterventions.map((i) => [i.userId, i.sentAt.toISOString()]));

  const items: ClinicalUserListItem[] = users.map((u) => {
    const s = stateMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      lastSeen: u.lastSeen.toISOString(),
      state: (s?.state ?? "neutral") as EmotionalState,
      riskLevel: (s?.riskLevel ?? "low") as RiskLevel,
      crisisActive: Boolean(s?.crisisActive),
      streakDays: streakMap.get(u.id) ?? 0,
      crisisEvents7d: crisis7dMap.get(u.id) ?? 0,
      interventions: interventionCountMap.get(u.id) ?? 0,
      lastInterventionAt: lastInterventionMap.get(u.id) ?? null,
    };
  });

  return { items, total };
}

export async function getClinicalUserDetail(userId: string): Promise<ClinicalUserDetail | null> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true, lastSeen: true, source: true },
  });
  if (!user) return null;

  const [state, messages, emotionalProfile, goals, crisisEvents, interventions] = await Promise.all([
    prisma.userState.findUnique({
      where: { userId },
      select: {
        state: true, riskLevel: true, crisisActive: true, crisisActivatedAt: true,
        mood: true, primaryEmotion: true, dominantPattern: true, focusArea: true,
        energyLevel: true, progressTrend: true, updatedAt: true,
      },
    }),
    prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MESSAGES_LIMIT,
      select: { id: true, role: true, content: true, createdAt: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
        clarityScore: true, autoestimaScore: true, energiaScore: true,
        disciplinaScore: true, socialScore: true, totalScore: true,
      },
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, status: true,
        actions: { select: { id: true, description: true, completed: true } },
      },
    }),
    prisma.crisisEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: CRISIS_LIMIT,
      select: { id: true, level: true, message: true, response: true, createdAt: true },
    }),
    prisma.intervention.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: INTERVENTIONS_LIMIT,
      select: { id: true, adminId: true, type: true, content: true, status: true, sentAt: true, readAt: true },
    }),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      lastSeen: user.lastSeen.toISOString(),
      source: user.source,
    },
    state: state
      ? {
          state: state.state as EmotionalState,
          riskLevel: state.riskLevel as RiskLevel,
          crisisActive: Boolean(state.crisisActive),
          crisisActivatedAt: state.crisisActivatedAt?.toISOString() ?? null,
          mood: state.mood,
          primaryEmotion: state.primaryEmotion,
          dominantPattern: state.dominantPattern,
          focusArea: state.focusArea,
          energyLevel: state.energyLevel,
          progressTrend: state.progressTrend,
          updatedAt: state.updatedAt.toISOString(),
        }
      : null,
    messages: messages.reverse().map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    emotionalProfile,
    goals,
    crisisEvents: crisisEvents.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    interventions: interventions.map((i) => ({
      ...i,
      type: i.type as InterventionType,
      status: i.status as InterventionStatus,
      sentAt: i.sentAt.toISOString(),
      readAt: i.readAt?.toISOString() ?? null,
    })),
  };
}

export async function createIntervention(params: {
  userId: string;
  adminId: string;
  type: InterventionType;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const prisma = getPrismaClient();
  return prisma.intervention.create({
    data: {
      userId: params.userId,
      adminId: params.adminId,
      type: params.type,
      content: params.content,
      status: "sent",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (params.metadata ?? null) as any,
    },
    select: { id: true, userId: true, type: true, content: true, status: true, sentAt: true },
  });
}
