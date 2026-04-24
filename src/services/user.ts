import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/db/prisma";
import { PLANS } from "@/lib/plans";
import { cache } from "@/lib/cache";

// Primary synthetic email domain for anonymous browser sessions.
// Format: <userId>@<SYNTHETIC_EMAIL_DOMAIN>. Never user-visible.
const SYNTHETIC_EMAIL_DOMAIN = "session.latidos.local";

// Legacy domain kept for backward compatibility with anonymous users created
// before the rebrand (2026-04). Any email ending in one of these is still
// recognized as synthetic. Do NOT remove without a data migration.
const LEGACY_SYNTHETIC_EMAIL_DOMAINS = ["session.luciernaga.local"] as const;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

// ── Cache TTLs ───────────────────────────────────────────────────────────────
const USER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/** Prefix for all per-user cache keys — used for targeted invalidation. */
const USER_CACHE_PREFIX = "user:";

/**
 * Invalidate all cached data for a given user (session profile + access state).
 * Call this after subscription changes, profile updates, etc.
 */
export function invalidateUserCache(userId: string): void {
  cache.invalidate(`${USER_CACHE_PREFIX}${userId}:access`);
  cache.invalidate(`${USER_CACHE_PREFIX}${userId}:profile`);
}

// ---------------------------------------------------------------------------
// Debounced lastSeen: avoids a DB write on every single request.
// Updates at most once per LAST_SEEN_DEBOUNCE_MS per user.
// ---------------------------------------------------------------------------
const LAST_SEEN_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes
const lastSeenCache = new Map<string, number>();

/**
 * Updates `lastSeen` for a user, but at most once every 5 minutes.
 * Fire-and-forget — callers should not await this.
 */
export function touchLastSeen(userId: string): void {
  const now = Date.now();
  const lastTouch = lastSeenCache.get(userId);
  if (lastTouch && now - lastTouch < LAST_SEEN_DEBOUNCE_MS) return;

  lastSeenCache.set(userId, now);

  // Evict old entries periodically to avoid memory leak
  if (lastSeenCache.size > 10_000) {
    const cutoff = now - LAST_SEEN_DEBOUNCE_MS;
    for (const [uid, ts] of lastSeenCache) {
      if (ts < cutoff) lastSeenCache.delete(uid);
    }
  }

  const prisma = getPrismaClient();
  void prisma.user.update({
    where: { id: userId },
    data: { lastSeen: new Date(now) },
  }).catch(() => {
    // User might not exist yet (bootstrap race) — ignore silently
    lastSeenCache.delete(userId);
  });
}
export const FREE_PLAN_MESSAGE_LIMIT = PLANS.free.limits.messagesPerConversation;
export type CanonicalUserPlan = "free" | "pro";

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
  bio: string | null;
  phone: string | null;
  role: string;
  plan: CanonicalUserPlan;
  planLabel: string;
  subscriptionStatus: string;
  hasPlan: boolean;
  isAnonymous: boolean;
  emailVerified: boolean;
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

export class UserAccountDisabledError extends Error {
  readonly reason: "deactivated" | "deleted";
  constructor(reason: "deactivated" | "deleted") {
    super(reason === "deleted" ? "ACCOUNT_DELETED" : "ACCOUNT_DEACTIVATED");
    this.name = "UserAccountDisabledError";
    this.reason = reason;
  }
}

export async function assertUserAccountUsable(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, deletedAt: true },
  });
  if (!user) return;
  if (user.deletedAt) throw new UserAccountDisabledError("deleted");
  if (!user.isActive) throw new UserAccountDisabledError("deactivated");
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
  plan: CanonicalUserPlan;
  hasPlan: boolean;
  subscriptionStatus: string;
  messagesUsedToday: number;
}): UserAccessState {
  // Free e ilimitado: el chat ya no tiene tope diario. Pro se diferencia por
  // extras (Modo Impulso, continuidad, prioridad), no por desbloquear cap.
  return {
    plan: params.plan,
    planLabel: getPlanLabel(params.plan),
    subscriptionStatus: params.subscriptionStatus,
    hasPlan: params.hasPlan,
    messagesUsedToday: params.messagesUsedToday,
    messagesRemainingToday: null,
    messageLimitPerDay: null,
  };
}

function normalizePlan(plan: string | null | undefined, hasPlan: boolean): CanonicalUserPlan {
  if (!hasPlan) {
    return "free";
  }

  const normalized = (plan || "").trim().toLowerCase();
  if (normalized === "pro" || normalized === "starter") {
    return "pro";
  }

  return "pro";
}

function getPlanLabel(plan: CanonicalUserPlan): string {
  return plan === "pro" ? "Pro" : "Free";
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

async function mergeUserProfileAssignments(params: {
  tx: Prisma.TransactionClient;
  sourceUserId: string;
  targetUserId: string;
}): Promise<void> {
  const [sourceProfile, targetProfile] = await Promise.all([
    params.tx.userProfile.findUnique({
      where: { userId: params.sourceUserId },
    }),
    params.tx.userProfile.findUnique({
      where: { userId: params.targetUserId },
    }),
  ]);

  if (!sourceProfile) {
    return;
  }

  if (!targetProfile) {
    await params.tx.userProfile.update({
      where: { id: sourceProfile.id },
      data: {
        userId: params.targetUserId,
      },
    });
    return;
  }

  const sourceIsNewer = sourceProfile.updatedAt > targetProfile.updatedAt;
  if (sourceIsNewer) {
    await params.tx.userProfile.update({
      where: { id: targetProfile.id },
      data: {
        profileId: sourceProfile.profileId,
        clarityScore: sourceProfile.clarityScore,
        autoestimaScore: sourceProfile.autoestimaScore,
        energiaScore: sourceProfile.energiaScore,
        disciplinaScore: sourceProfile.disciplinaScore,
        socialScore: sourceProfile.socialScore,
        totalScore: sourceProfile.totalScore,
        rawAnswers: sourceProfile.rawAnswers as Prisma.InputJsonValue,
      },
    });
  }

  await params.tx.userProfile.delete({
    where: { id: sourceProfile.id },
  });
}

async function mergeUserStreaks(params: {
  tx: Prisma.TransactionClient;
  sourceUserId: string;
  targetUserId: string;
}): Promise<void> {
  const [sourceStreak, targetStreak] = await Promise.all([
    params.tx.streak.findUnique({
      where: { userId: params.sourceUserId },
    }),
    params.tx.streak.findUnique({
      where: { userId: params.targetUserId },
    }),
  ]);

  if (!sourceStreak) {
    return;
  }

  if (!targetStreak) {
    await params.tx.streak.update({
      where: { id: sourceStreak.id },
      data: {
        userId: params.targetUserId,
      },
    });
    return;
  }

  await params.tx.streak.update({
    where: { id: targetStreak.id },
    data: {
      currentDays: Math.max(targetStreak.currentDays, sourceStreak.currentDays),
      bestDays: Math.max(targetStreak.bestDays, sourceStreak.bestDays),
      lastCheckInDate:
        !targetStreak.lastCheckInDate ||
        (sourceStreak.lastCheckInDate &&
          sourceStreak.lastCheckInDate > targetStreak.lastCheckInDate)
          ? sourceStreak.lastCheckInDate
          : targetStreak.lastCheckInDate,
      status:
        targetStreak.status === "active" || sourceStreak.status === "active"
          ? "active"
          : targetStreak.status,
    },
  });

  await params.tx.streak.delete({
    where: { id: sourceStreak.id },
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
    params.tx.userChallenge.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
    params.tx.futureMessage.updateMany({
      where: { userId: params.sourceUserId },
      data: { userId: params.targetUserId },
    }),
  ]);
  await Promise.all([
    mergeUserStates(params),
    mergeUserProfileAssignments(params),
    mergeUserStreaks(params),
  ]);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildSyntheticEmail(userId: string): string {
  return `${normalizeSyntheticLocalPart(userId)}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  if (email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)) return true;
  return LEGACY_SYNTHETIC_EMAIL_DOMAINS.some((d) => email.endsWith(`@${d}`));
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

  const result = await prisma.$transaction(async (tx) => {
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
          currentUser.lastSeen > existingUser.lastSeen
            ? currentUser.lastSeen
            : existingUser.lastSeen,
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

  // Invalidate both the old and new user cache entries after merge
  invalidateUserCache(params.currentUserId);
  invalidateUserCache(result.userId);

  return result;
}

export async function linkTelegramIdentity(params: {
  currentUserId: string;
  telegramUserId: string;
}): Promise<{ userId: string }> {
  const prisma = getPrismaClient();

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const currentUser = await tx.user.findUnique({ where: { id: params.currentUserId } });
    if (!currentUser) {
      throw new Error("CURRENT_USER_NOT_FOUND");
    }

    const telegramUser = await tx.user.findUnique({ where: { id: params.telegramUserId } });
    if (!telegramUser) {
      throw new Error("TELEGRAM_USER_NOT_FOUND");
    }

    if (telegramUser.id === currentUser.id) {
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          source: "telegram",
          consentGiven: true,
          consentAt: telegramUser.consentAt ?? now,
          telegramId: telegramUser.telegramId ?? currentUser.telegramId,
          lastSeen: now,
        },
      });
      return { userId: currentUser.id };
    }

    if (telegramUser.telegramId) {
      const telegramBoundElsewhere = await tx.user.findFirst({
        where: {
          telegramId: telegramUser.telegramId,
          NOT: { id: { in: [currentUser.id, telegramUser.id] } },
        },
        select: { id: true },
      });
      if (telegramBoundElsewhere) {
        throw new Error("TELEGRAM_ALREADY_LINKED");
      }
    }

    await tx.user.update({
      where: { id: currentUser.id },
      data: {
        telegramId: telegramUser.telegramId ?? currentUser.telegramId,
        consentGiven: true,
        consentAt: telegramUser.consentAt ?? currentUser.consentAt ?? now,
        source: "telegram",
        lastSeen: now,
      },
    });

    await moveUserOwnedRecords({
      tx,
      sourceUserId: telegramUser.id,
      targetUserId: currentUser.id,
    });

    await tx.user.delete({
      where: { id: telegramUser.id },
    });

    return { userId: currentUser.id };
  });

  // Invalidate both user caches after identity merge
  invalidateUserCache(params.currentUserId);
  invalidateUserCache(params.telegramUserId);

  return result;
}

export async function getUserAccessState(userId: string): Promise<UserAccessState> {
  touchLastSeen(userId);

  return cache.get<UserAccessState>(
    `${USER_CACHE_PREFIX}${userId}:access`,
    USER_CACHE_TTL_MS,
    async () => {
      const prisma = getPrismaClient();

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
      let hasPlan = ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus);

      // MVP mode: grant Pro to all users until the configured date
      const mvpUntil = process.env.MVP_PRO_UNTIL?.trim(); // e.g. "2026-10-08"
      if (mvpUntil && !hasPlan) {
        const mvpEnd = new Date(mvpUntil);
        if (!isNaN(mvpEnd.getTime()) && new Date() < mvpEnd) {
          hasPlan = true;
        }
      }

      const plan = normalizePlan(latestSubscription?.plan, hasPlan);

      return buildAccessState({
        plan,
        hasPlan,
        subscriptionStatus,
        messagesUsedToday,
      });
    },
  );
}

export async function getUserSessionProfile(userId: string): Promise<UserSessionProfile> {
  touchLastSeen(userId);

  return cache.get<UserSessionProfile>(
    `${USER_CACHE_PREFIX}${userId}:profile`,
    USER_CACHE_TTL_MS,
    async () => {
      const prisma = getPrismaClient();

      // Read-only fetch — user must already exist (created at bootstrap/signup).
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        // Defensive fallback: should only happen if data was wiped or race at bootstrap.
        const created = await ensureUserAccount(userId);
        const accessState = await getUserAccessState(userId);
        return {
          id: created.id,
          email: created.email,
          name: created.name,
          bio: null,
          phone: null,
          role: created.role,
          isAnonymous: isSyntheticEmail(created.email),
          emailVerified: false,
          ...accessState,
        };
      }

      const accessState = await getUserAccessState(userId);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio ?? null,
        phone: user.phone ?? null,
        role: user.role,
        isAnonymous: isSyntheticEmail(user.email),
        emailVerified: user.emailVerified ?? false,
        ...accessState,
      };
    },
  );
}
