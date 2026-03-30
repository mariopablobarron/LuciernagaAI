import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/db/prisma";

const SYNTHETIC_EMAIL_DOMAIN = "session.luciernaga.local";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
export const FREE_PLAN_MESSAGE_LIMIT = 10;

type UserStateRecord = {
  id: string;
  userId: string;
  state: string;
  transformationPhase: string;
  mood: string | null;
  primaryEmotion: string;
  dominantPattern: string;
  focusArea: string;
  energyLevel: string;
  riskLevel: string;
  progressTrend: string;
  crisisActive: boolean;
  crisisActivatedAt: Date | null;
  crisisActiveUntil: Date | null;
  updatedAt: Date;
};

export type UserSessionProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  planLabel: string;
  subscriptionStatus: string;
  hasPlan: boolean;
  isAnonymous: boolean;
  messagesUsedToday: number;
  messagesRemainingToday: number | null;
  messageLimitPerDay: number | null;
};

export type UserAccessState = Pick<
  UserSessionProfile,
  | "plan"
  | "planLabel"
  | "subscriptionStatus"
  | "hasPlan"
  | "messagesUsedToday"
  | "messagesRemainingToday"
  | "messageLimitPerDay"
>;

export class IdentityLinkConflictError extends Error {
  constructor() {
    super("IDENTITY_ALREADY_LINKED");
    this.name = "IdentityLinkConflictError";
  }
}

function normalizeSyntheticLocalPart(userId: string): string {
  const safeValue = userId
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return safeValue || "anon";
}

function buildAccessState(params: {
  plan: string;
  hasPlan: boolean;
  subscriptionStatus: string;
  messagesUsedToday: number;
}): UserAccessState {
  const messageLimitPerDay = params.hasPlan ? null : FREE_PLAN_MESSAGE_LIMIT;
  const messagesRemainingToday = params.hasPlan
    ? null
    : Math.max(0, FREE_PLAN_MESSAGE_LIMIT - params.messagesUsedToday);

  return {
    plan: params.plan,
    planLabel: getPlanLabel(params.plan, params.hasPlan),
    subscriptionStatus: params.subscriptionStatus,
    hasPlan: params.hasPlan,
    messagesUsedToday: params.messagesUsedToday,
    messagesRemainingToday,
    messageLimitPerDay,
  };
}

function getPlanLabel(plan: string, hasPlan: boolean): string {
  if (!hasPlan) {
    return "Free";
  }

  if (plan === "starter") {
    return "Starter";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return plan
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStartOfDay(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function getUserStatePatch(source: UserStateRecord) {
  return {
    state: source.state,
    transformationPhase: source.transformationPhase,
    mood: source.mood,
    primaryEmotion: source.primaryEmotion,
    dominantPattern: source.dominantPattern,
    focusArea: source.focusArea,
    energyLevel: source.energyLevel,
    riskLevel: source.riskLevel,
    progressTrend: source.progressTrend,
    crisisActive: source.crisisActive,
    crisisActivatedAt: source.crisisActivatedAt,
    crisisActiveUntil: source.crisisActiveUntil,
  };
}

async function mergeUserStates(params: {
  tx: Prisma.TransactionClient;
  sourceUserId: string;
  targetUserId: string;
}): Promise<void> {
  const [sourceState, targetState] = await Promise.all([
    params.tx.userState.findUnique({ where: { userId: params.sourceUserId } }),
    params.tx.userState.findUnique({ where: { userId: params.targetUserId } }),
  ]);

  if (!sourceState) {
    return;
  }

  if (!targetState) {
    await params.tx.userState.update({
      where: { id: sourceState.id },
      data: {
        userId: params.targetUserId,
      },
    });
    return;
  }

  if (sourceState.updatedAt > targetState.updatedAt) {
    await params.tx.userState.update({
      where: { id: targetState.id },
      data: getUserStatePatch(sourceState),
    });
  }

  await params.tx.userState.delete({
    where: { id: sourceState.id },
  });
}

async function moveUserOwnedRecords(params: {
  tx: Prisma.TransactionClient;
  sourceUserId: string;
  targetUserId: string;
}): Promise<void> {
  await Promise.all([
    params.tx.conversation.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.message.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.goal.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.crisisEvent.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.avoidanceEvent.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.dailyCheckin.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.dailyLog.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.subscription.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
  ]);
  await mergeUserStates(params);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildSyntheticEmail(userId: string): string {
  return `${normalizeSyntheticLocalPart(userId)}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

export async function ensureUserAccount(userId: string) {
  const prisma = getPrismaClient();
  const now = new Date();

  return prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: buildSyntheticEmail(userId),
      lastSeen: now,
    },
    update: {
      lastSeen: now,
    },
  });
}

export async function linkIdentityToEmail(params: {
  currentUserId: string;
  email: string;
  name?: string | null;
}): Promise<{ userId: string }> {
  const prisma = getPrismaClient();
  const normalizedEmail = normalizeEmail(params.email);
  const nextName = params.name?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const currentUser =
      (await tx.user.findUnique({
        where: { id: params.currentUserId },
      })) ||
      (await tx.user.create({
        data: {
          id: params.currentUserId,
          email: buildSyntheticEmail(params.currentUserId),
          lastSeen: now,
        },
      }));

    if (
      !isSyntheticEmail(currentUser.email) &&
      normalizeEmail(currentUser.email) !== normalizedEmail
    ) {
      throw new IdentityLinkConflictError();
    }

    const existingUser = await tx.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existingUser) {
      const updatedCurrent = await tx.user.update({
        where: { id: currentUser.id },
        data: {
          email: normalizedEmail,
          name: nextName ?? currentUser.name,
          lastSeen: now,
        },
      });

      return { userId: updatedCurrent.id };
    }

    if (existingUser.id === currentUser.id) {
      const updatedCurrent = await tx.user.update({
        where: { id: currentUser.id },
        data: {
          email: normalizedEmail,
          name: nextName ?? currentUser.name,
          lastSeen: now,
        },
      });

      return { userId: updatedCurrent.id };
    }

    await tx.user.update({
      where: { id: existingUser.id },
      data: {
        name: existingUser.name ?? nextName,
        lastSeen:
          currentUser.lastSeen > existingUser.lastSeen ? currentUser.lastSeen : existingUser.lastSeen,
      },
    });

    await moveUserOwnedRecords({
      tx,
      sourceUserId: currentUser.id,
      targetUserId: existingUser.id,
    });

    await tx.user.delete({
      where: { id: currentUser.id },
    });

    return { userId: existingUser.id };
  });
}

export async function getUserAccessState(userId: string): Promise<UserAccessState> {
  const prisma = getPrismaClient();
  await ensureUserAccount(userId);

  const [latestSubscription, messagesUsedToday] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        plan: true,
      },
    }),
    prisma.message.count({
      where: {
        userId,
        role: "user",
        createdAt: {
          gte: getStartOfDay(),
        },
      },
    }),
  ]);

  const subscriptionStatus = latestSubscription?.status ?? "free";
  const hasPlan = ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus);
  const plan = hasPlan ? latestSubscription?.plan ?? "starter" : "free";

  return buildAccessState({
    plan,
    hasPlan,
    subscriptionStatus,
    messagesUsedToday,
  });
}

export async function getUserSessionProfile(userId: string): Promise<UserSessionProfile> {
  const user = await ensureUserAccount(userId);
  const accessState = await getUserAccessState(userId);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAnonymous: isSyntheticEmail(user.email),
    ...accessState,
  };
}
