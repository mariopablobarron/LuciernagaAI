import { promises as fs } from "fs";
import path from "path";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import {
  type AvatarPhase,
  generateGoalAvatarScript,
} from "@/services/avatarScriptGenerator";
import {
  createAvatarVideo,
  downloadAvatarVideo,
  getAvatarVideoStatus,
} from "@/services/heygen";

export type TriggerReason =
  | "goal_created"
  | "goal_completed"
  | "state_bloqueo"
  | "state_low_energy"
  | "state_negative_emotion";

export type TriggerResult =
  | { ok: true; videoRowId: string; phase: AvatarPhase }
  | { ok: false; reason: string };

export type MidpointScanStats = {
  enabled: boolean;
  candidateGoals: number;
  generated: number;
  cappedByDailyLimit: boolean;
  skipped: number;
  failed: number;
};

export type PollStats = {
  pending: number;
  ready: number;
  stillProcessing: number;
  failed: number;
};

// ── Storage ────────────────────────────────────────────────────────────────

function avatarStorageDir(): string {
  return path.join(process.cwd(), "public", "avatars");
}

async function writeVideoToDisk(
  userId: string,
  goalId: string,
  phase: AvatarPhase,
  buf: Buffer,
): Promise<string> {
  const dir = path.join(avatarStorageDir(), userId);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${goalId}-${phase.toLowerCase()}.mp4`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buf);
  return `/avatars/${userId}/${filename}`;
}

// ── Config helpers ─────────────────────────────────────────────────────────

async function loadConfig() {
  const prisma = getPrismaClient();
  return prisma.avatarVideoConfig.findUnique({ where: { id: "singleton" } });
}

async function isUserOptedIn(userId: string): Promise<boolean> {
  const prisma = getPrismaClient();
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { avatarVideosEnabled: true },
  });
  if (!prefs) return true; // default: opted in
  return prefs.avatarVideosEnabled;
}

async function dailyCountSoFar(): Promise<number> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.goalAvatarVideo.count({ where: { createdAt: { gte: since } } });
}

// ── Trigger: generate a single milestone video ─────────────────────────────

export async function triggerGoalAvatarVideo(params: {
  userId: string;
  goalId: string;
  phase: AvatarPhase;
  trigger: TriggerReason;
}): Promise<TriggerResult> {
  const { userId, goalId, phase, trigger } = params;
  const prisma = getPrismaClient();

  try {
    const config = await loadConfig();
    if (!config || !config.enabled) {
      return { ok: false, reason: "system_disabled" };
    }

    if (!(await isUserOptedIn(userId))) {
      return { ok: false, reason: "user_opted_out" };
    }

    // Unique: one per (goalId, phase)
    const existing = await prisma.goalAvatarVideo.findUnique({
      where: { goalId_phase: { goalId, phase } },
      select: { id: true },
    });
    if (existing) {
      return { ok: false, reason: "already_exists" };
    }

    // Global daily cap
    const todayCount = await dailyCountSoFar();
    if (todayCount >= config.maxVideosPerDay) {
      logInfo("AVATAR_GOAL", "daily_cap_reached", {
        todayCount,
        cap: config.maxVideosPerDay,
      });
      return { ok: false, reason: "daily_cap_reached" };
    }

    const promptTemplate =
      phase === "START"
        ? config.promptTemplateStart
        : phase === "MIDPOINT"
          ? config.promptTemplateMidpoint
          : config.promptTemplateEnd;

    const script = await generateGoalAvatarScript({
      userId,
      goalId,
      phase,
      promptTemplate,
    });

    const { videoId } = await createAvatarVideo({
      avatarId: config.avatarId,
      script,
    });

    const row = await prisma.goalAvatarVideo.create({
      data: {
        userId,
        goalId,
        phase,
        trigger,
        script,
        heygenVideoId: videoId,
        status: "PENDING",
      },
      select: { id: true },
    });

    logInfo("AVATAR_GOAL", "video_triggered", {
      userId,
      goalId,
      phase,
      trigger,
      videoRowId: row.id,
    });
    return { ok: true, videoRowId: row.id, phase };
  } catch (error: unknown) {
    logError("AVATAR_GOAL", error, {
      area: "trigger",
      userId,
      goalId,
      phase,
      trigger,
    });
    // Persist a FAILED row so admins can see what broke, but only if none exists yet
    await prisma.goalAvatarVideo
      .upsert({
        where: { goalId_phase: { goalId, phase } },
        create: {
          userId,
          goalId,
          phase,
          trigger,
          script: "",
          status: "FAILED",
          errorMessage:
            error instanceof Error ? error.message.slice(0, 500) : "unknown",
        },
        update: {},
      })
      .catch(() => {});
    return {
      ok: false,
      reason: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    };
  }
}

/**
 * Fire-and-forget wrapper. Never throws. Use from request paths where the
 * video generation shouldn't block the user's response.
 */
export function triggerGoalAvatarVideoAsync(params: {
  userId: string;
  goalId: string;
  phase: AvatarPhase;
  trigger: TriggerReason;
}): void {
  triggerGoalAvatarVideo(params).catch((error: unknown) => {
    logError("AVATAR_GOAL", error, { area: "async_trigger", ...params });
  });
}

// ── Midpoint scan (daily cron) ─────────────────────────────────────────────

/**
 * Scans active goals belonging to users whose emotional state signals
 * difficulty, and generates a MIDPOINT video for those without one yet.
 * Deliberately conservative to avoid noise.
 */
export async function runMidpointScan(): Promise<MidpointScanStats> {
  const prisma = getPrismaClient();
  const config = await loadConfig();
  const stats: MidpointScanStats = {
    enabled: config?.enabled ?? false,
    candidateGoals: 0,
    generated: 0,
    cappedByDailyLimit: false,
    skipped: 0,
    failed: 0,
  };

  if (!config || !config.enabled) {
    logInfo("AVATAR_GOAL", "midpoint_scan_disabled", {});
    return stats;
  }

  // Goal must be at least N days old before midpoint fires
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - config.midpointMinDays);

  // Find active goals where:
  // - user has an active UserState signaling difficulty
  // - user is opted in
  // - no midpoint video exists yet for this goal
  const candidates = await prisma.goal.findMany({
    where: {
      status: "active",
      createdAt: { lte: cutoff },
      user: {
        isActive: true,
        deletedAt: null,
        OR: [
          { preferences: { is: null } },
          { preferences: { avatarVideosEnabled: true } },
        ],
        userState: {
          AND: [
            // Trigger: low emotional state
            {
              OR: [
                { state: { in: ["bloqueo", "ansiedad", "duda"] } },
                { primaryEmotion: { in: ["tristeza", "ansiedad", "miedo", "frustracion"] } },
                { energyLevel: "bajo" },
                { transformationPhase: "bloqueo" },
              ],
            },
            // Clinical safety gate: NEVER deliver MIDPOINT to users in active
            // crisis or high/critical risk. The avatar video is not a
            // therapeutic intervention and must not be injected during the
            // most vulnerable moments. This rule is enforced in code and
            // reviewed by the responsible clinical psychologist.
            { riskLevel: { notIn: ["high", "critical"] } },
            { crisisActive: false },
          ],
        },
      },
      avatarVideos: { none: { phase: "MIDPOINT" } },
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          userState: {
            select: {
              state: true,
              energyLevel: true,
              primaryEmotion: true,
            },
          },
        },
      },
    },
    take: config.maxVideosPerDay + 1,
  });

  stats.candidateGoals = candidates.length;

  for (const goal of candidates) {
    const todayCount = await dailyCountSoFar();
    if (todayCount >= config.maxVideosPerDay) {
      stats.cappedByDailyLimit = true;
      break;
    }

    const us = goal.user.userState;
    const triggerReason: TriggerReason =
      us?.state === "bloqueo" || us?.primaryEmotion === "bloqueo"
        ? "state_bloqueo"
        : us?.energyLevel === "bajo"
          ? "state_low_energy"
          : "state_negative_emotion";

    const result = await triggerGoalAvatarVideo({
      userId: goal.userId,
      goalId: goal.id,
      phase: "MIDPOINT",
      trigger: triggerReason,
    });

    if (result.ok) stats.generated += 1;
    else if (result.reason === "already_exists") stats.skipped += 1;
    else stats.failed += 1;
  }

  logInfo("AVATAR_GOAL", "midpoint_scan_complete", { ...stats });
  return stats;
}

// ── Polling job (shared with all phases) ───────────────────────────────────

export async function runPollGoalAvatarVideos(): Promise<PollStats> {
  const prisma = getPrismaClient();

  const pending = await prisma.goalAvatarVideo.findMany({
    where: { status: "PENDING", heygenVideoId: { not: null } },
    select: {
      id: true,
      userId: true,
      goalId: true,
      phase: true,
      heygenVideoId: true,
    },
    take: 50,
  });

  const stats: PollStats = {
    pending: pending.length,
    ready: 0,
    stillProcessing: 0,
    failed: 0,
  };

  for (const row of pending) {
    if (!row.heygenVideoId) continue;
    try {
      const { status, videoUrl, errorMessage } = await getAvatarVideoStatus(
        row.heygenVideoId,
      );

      if (status === "completed" && videoUrl) {
        const buf = await downloadAvatarVideo(videoUrl);
        const relativeUrl = await writeVideoToDisk(
          row.userId,
          row.goalId,
          row.phase as AvatarPhase,
          buf,
        );
        await prisma.goalAvatarVideo.update({
          where: { id: row.id },
          data: { status: "READY", videoUrl: relativeUrl },
        });
        stats.ready += 1;
      } else if (status === "failed") {
        await prisma.goalAvatarVideo.update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            errorMessage: errorMessage?.slice(0, 500) ?? "heygen_failed",
          },
        });
        stats.failed += 1;
      } else {
        stats.stillProcessing += 1;
      }
    } catch (error: unknown) {
      stats.failed += 1;
      logError("AVATAR_GOAL", error, {
        area: "poll_single",
        videoRowId: row.id,
        heygenVideoId: row.heygenVideoId,
      });
      await prisma.goalAvatarVideo
        .update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            errorMessage:
              error instanceof Error ? error.message.slice(0, 500) : "poll_error",
          },
        })
        .catch(() => {});
    }
  }

  logInfo("AVATAR_GOAL", "poll_complete", { ...stats });
  return stats;
}
