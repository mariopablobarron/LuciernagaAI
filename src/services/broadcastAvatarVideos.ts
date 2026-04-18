import { promises as fs } from "fs";
import path from "path";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { fetchWithTimeout } from "@/lib/utils";
import {
  createAvatarVideo,
  downloadAvatarVideo,
  getAvatarVideoStatus,
} from "@/services/heygen";
import {
  getRecipientsBySegment,
  type SegmentKey,
} from "@/services/marketing-segments";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4-6";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_CONTEXT_CHARS = 3_500;

export type BroadcastMode = "literal" | "briefing";

export type CreateBroadcastParams = {
  title: string;
  segment: SegmentKey | "single";
  userEmail?: string; // required if segment="single"
  mode: BroadcastMode;
  literalScript?: string;
  briefing?: string;
  isShared: boolean;
  createdBy: string;
};

export type CreateBroadcastResult = {
  campaignId: string;
  recipientCount: number;
  status: string;
};

export type BroadcastPollStats = {
  sharedPending: number;
  sharedReady: number;
  sharedFailed: number;
  perUserPending: number;
  perUserReady: number;
  perUserFailed: number;
};

export type BroadcastLimitState = {
  monthlyCount: number;
  monthlyCap: number;
  monthlyRemaining: number;
  cooldownDays: number;
  lastBroadcastAt: string | null;
};

export class BroadcastLimitError extends Error {
  code: "monthly_cap" | "no_recipients_after_cooldown";
  details: Record<string, unknown>;

  constructor(
    code: "monthly_cap" | "no_recipients_after_cooldown",
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "BroadcastLimitError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Returns the current state of broadcast guardrails (rolling 30-day count,
 * cap, cooldown days, last broadcast timestamp). Used by the admin UI to
 * show a counter and disable the send button when at the cap.
 */
export async function getBroadcastLimitState(): Promise<BroadcastLimitState> {
  const prisma = getPrismaClient();
  const config = await prisma.avatarVideoConfig.findUnique({
    where: { id: "singleton" },
    select: { maxBroadcastsPerMonth: true, broadcastUserCooldownDays: true },
  });

  const monthlyCap = config?.maxBroadcastsPerMonth ?? 4;
  const cooldownDays = config?.broadcastUserCooldownDays ?? 7;
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [monthlyCount, last] = await Promise.all([
    prisma.broadcastAvatarCampaign.count({
      where: { createdAt: { gte: monthAgo } },
    }),
    prisma.broadcastAvatarCampaign.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    monthlyCount,
    monthlyCap,
    monthlyRemaining: Math.max(0, monthlyCap - monthlyCount),
    cooldownDays,
    lastBroadcastAt: last?.createdAt.toISOString() ?? null,
  };
}

// ── Storage ────────────────────────────────────────────────────────────────

function avatarStorageDir(): string {
  return path.join(process.cwd(), "public", "avatars");
}

async function writeBroadcastVideoToDisk(
  subdir: "shared" | "deliveries",
  id: string,
  buf: Buffer,
): Promise<string> {
  const dir = path.join(avatarStorageDir(), "broadcasts", subdir);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${id}.mp4`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buf);
  return `/avatars/broadcasts/${subdir}/${filename}`;
}

// ── Script helpers ─────────────────────────────────────────────────────────

async function generateScriptFromBriefing(params: {
  briefing: string;
  userContext?: string;
  userName?: string;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const systemPrompt = `Eres Tres Mil Millones de Latidos, un mentor cálido y lúcido.

Transforma el siguiente briefing del equipo en un guión hablado para un video del mentor.

Briefing del equipo:
${params.briefing}

${params.userName ? `El mensaje va dirigido a: ${params.userName}` : ""}
${params.userContext ? `Contexto reciente del usuario:\n${params.userContext}` : ""}

Reglas absolutas:
- Máximo 50 palabras (≈20 segundos hablados).
- Tono cercano, directo, sin azúcar.
- Evita imperativos huecos ("deberías", "tienes que", "sigue así", "tú puedes").
- Si el briefing implica felicitar, no lo hagas plano — señala algo concreto.
- Devuelve SOLO el guión, sin comillas ni preámbulo.`;

  const res = await fetchWithTimeout(
    OPENROUTER_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": "mentor-web-broadcast-script",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "Genera el guión. Máximo 50 palabras. Solo el guión.",
          },
        ],
        temperature: 0.6,
        max_tokens: 220,
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter broadcast script failed: HTTP ${res.status} — ${text.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) throw new Error("OpenRouter returned an empty broadcast script");
  return raw.replace(/^["'`]+|["'`]+$/g, "").trim();
}

async function fetchUserContext(userId: string): Promise<string> {
  const prisma = getPrismaClient();
  const messages = await prisma.message.findMany({
    where: { userId, role: "user" },
    orderBy: { createdAt: "desc" },
    select: { content: true },
    take: 15,
  });
  const joined = messages
    .reverse()
    .map((m) => `- ${m.content.replace(/\s+/g, " ").slice(0, 240)}`)
    .join("\n");
  return joined.slice(0, MAX_CONTEXT_CHARS);
}

// ── Create broadcast ───────────────────────────────────────────────────────

/**
 * Creates a broadcast campaign and enqueues delivery rows. Returns the
 * campaign id immediately; video generation runs asynchronously via the
 * processBroadcastCampaign function below, which is called from the
 * admin endpoint right after creation (fire-and-forget).
 */
export async function createBroadcast(
  params: CreateBroadcastParams,
): Promise<CreateBroadcastResult> {
  if (!params.title.trim()) throw new Error("title required");
  if (params.mode === "literal" && !params.literalScript?.trim()) {
    throw new Error("literalScript required when mode=literal");
  }
  if (params.mode === "briefing" && !params.briefing?.trim()) {
    throw new Error("briefing required when mode=briefing");
  }
  if (params.segment === "single" && !params.userEmail?.trim()) {
    throw new Error("userEmail required when segment=single");
  }

  const prisma = getPrismaClient();

  // ── Guardrail 1: monthly cap (rolling 30 days) ───────────────────────────
  const limits = await getBroadcastLimitState();
  if (limits.monthlyRemaining <= 0) {
    throw new BroadcastLimitError(
      "monthly_cap",
      `Cap mensual alcanzado: ${limits.monthlyCount}/${limits.monthlyCap} broadcasts en los últimos 30 días. Sube el cap en config si es intencional.`,
      { monthlyCount: limits.monthlyCount, monthlyCap: limits.monthlyCap },
    );
  }

  // Resolve recipients
  let recipients: Array<{ id: string; name: string | null; email: string }>;
  if (params.segment === "single") {
    const user = await prisma.user.findUnique({
      where: { email: params.userEmail!.trim() },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new Error(`User not found: ${params.userEmail}`);
    recipients = [user];
  } else {
    const raw = await getRecipientsBySegment(params.segment);
    recipients = raw.map((r) => ({ id: r.id, name: r.name, email: r.email }));
  }

  // ── Filter 1: opt-outs ───────────────────────────────────────────────────
  const optedOut = await prisma.userPreferences.findMany({
    where: {
      userId: { in: recipients.map((r) => r.id) },
      avatarVideosEnabled: false,
    },
    select: { userId: true },
  });
  const optedOutSet = new Set(optedOut.map((p) => p.userId));

  // ── Filter 2: per-recipient cooldown ─────────────────────────────────────
  // Drop users who received any broadcast in the last cooldownDays.
  const cooldownCutoff = new Date(
    Date.now() - limits.cooldownDays * 24 * 60 * 60 * 1000,
  );
  const recentlyDelivered = await prisma.broadcastAvatarDelivery.findMany({
    where: {
      userId: { in: recipients.map((r) => r.id) },
      createdAt: { gte: cooldownCutoff },
    },
    select: { userId: true },
  });
  const recentSet = new Set(recentlyDelivered.map((d) => d.userId));

  const finalRecipients = recipients.filter(
    (r) => !optedOutSet.has(r.id) && !recentSet.has(r.id),
  );

  if (finalRecipients.length === 0) {
    throw new BroadcastLimitError(
      "no_recipients_after_cooldown",
      `Ningún destinatario válido tras filtrar opt-outs (${optedOutSet.size}) y cooldown de ${limits.cooldownDays} días (${recentSet.size}).`,
      {
        candidates: recipients.length,
        optedOut: optedOutSet.size,
        inCooldown: recentSet.size,
      },
    );
  }

  // Create campaign + deliveries in a transaction
  const campaign = await prisma.broadcastAvatarCampaign.create({
    data: {
      title: params.title.trim(),
      segment: params.segment,
      mode: params.mode,
      isShared: params.isShared,
      briefing: params.briefing ?? null,
      literalScript: params.literalScript ?? null,
      recipientCount: finalRecipients.length,
      createdBy: params.createdBy,
      status: "PENDING",
    },
  });

  await prisma.broadcastAvatarDelivery.createMany({
    data: finalRecipients.map((r) => ({
      campaignId: campaign.id,
      userId: r.id,
      // Initial script — for shared literal we can pre-fill; for other cases
      // the processor will set the real script per delivery.
      script: params.mode === "literal" ? params.literalScript! : "",
      status: "PENDING",
    })),
    skipDuplicates: true,
  });

  logInfo("AVATAR_BROADCAST", "campaign_created", {
    campaignId: campaign.id,
    segment: params.segment,
    recipientCount: finalRecipients.length,
    mode: params.mode,
    isShared: params.isShared,
    createdBy: params.createdBy,
  });

  return {
    campaignId: campaign.id,
    recipientCount: finalRecipients.length,
    status: campaign.status,
  };
}

// ── Process campaign (generate HeyGen videos) ──────────────────────────────

async function loadAvatarId(): Promise<string> {
  const prisma = getPrismaClient();
  const config = await prisma.avatarVideoConfig.findUnique({
    where: { id: "singleton" },
    select: { avatarId: true, enabled: true },
  });
  if (!config) throw new Error("AvatarVideoConfig not initialized");
  if (!config.enabled) throw new Error("Avatar video system is disabled");
  return config.avatarId;
}

export async function processBroadcastCampaign(
  campaignId: string,
): Promise<void> {
  const prisma = getPrismaClient();
  const campaign = await prisma.broadcastAvatarCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
  if (campaign.status !== "PENDING") {
    logInfo("AVATAR_BROADCAST", "process_skipped_not_pending", {
      campaignId,
      status: campaign.status,
    });
    return;
  }

  const avatarId = await loadAvatarId();

  await prisma.broadcastAvatarCampaign.update({
    where: { id: campaignId },
    data: { status: "GENERATING" },
  });

  try {
    if (campaign.isShared) {
      // Generate ONE video, all deliveries will reuse it after polling
      const script =
        campaign.mode === "literal"
          ? campaign.literalScript!
          : await generateScriptFromBriefing({ briefing: campaign.briefing! });

      const { videoId } = await createAvatarVideo({ avatarId, script });

      await prisma.broadcastAvatarCampaign.update({
        where: { id: campaignId },
        data: { sharedHeygenId: videoId },
      });
      await prisma.broadcastAvatarDelivery.updateMany({
        where: { campaignId },
        data: { script },
      });

      logInfo("AVATAR_BROADCAST", "shared_generation_requested", {
        campaignId,
        videoId,
      });
    } else {
      // Per-user: generate a unique video for each delivery
      const deliveries = await prisma.broadcastAvatarDelivery.findMany({
        where: { campaignId, status: "PENDING" },
        select: {
          id: true,
          userId: true,
          user: { select: { name: true, email: true } },
        },
      });

      for (const d of deliveries) {
        try {
          let script: string;
          if (campaign.mode === "literal") {
            script = campaign.literalScript!;
          } else {
            const context = await fetchUserContext(d.userId);
            script = await generateScriptFromBriefing({
              briefing: campaign.briefing!,
              userContext: context,
              userName: d.user.name?.trim() ?? d.user.email.split("@")[0],
            });
          }

          const { videoId } = await createAvatarVideo({ avatarId, script });

          await prisma.broadcastAvatarDelivery.update({
            where: { id: d.id },
            data: { script, heygenVideoId: videoId },
          });
        } catch (error: unknown) {
          await prisma.broadcastAvatarDelivery
            .update({
              where: { id: d.id },
              data: {
                status: "FAILED",
                errorMessage:
                  error instanceof Error
                    ? error.message.slice(0, 500)
                    : "unknown",
              },
            })
            .catch(() => {});
          logError("AVATAR_BROADCAST", error, {
            area: "per_user_generate",
            deliveryId: d.id,
          });
        }
      }
    }
  } catch (error: unknown) {
    await prisma.broadcastAvatarCampaign.update({
      where: { id: campaignId },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message.slice(0, 500) : "unknown",
      },
    });
    throw error;
  }
}

export function processBroadcastCampaignAsync(campaignId: string): void {
  processBroadcastCampaign(campaignId).catch((error: unknown) => {
    logError("AVATAR_BROADCAST", error, { area: "async_process", campaignId });
  });
}

// ── Polling (called from the shared poll cron) ─────────────────────────────

export async function runPollBroadcastAvatarVideos(): Promise<BroadcastPollStats> {
  const prisma = getPrismaClient();

  const stats: BroadcastPollStats = {
    sharedPending: 0,
    sharedReady: 0,
    sharedFailed: 0,
    perUserPending: 0,
    perUserReady: 0,
    perUserFailed: 0,
  };

  // ── Shared campaigns waiting for HeyGen to finish ────────────────────────
  const sharedCampaigns = await prisma.broadcastAvatarCampaign.findMany({
    where: {
      isShared: true,
      status: "GENERATING",
      sharedHeygenId: { not: null },
    },
    take: 20,
  });
  stats.sharedPending = sharedCampaigns.length;

  for (const c of sharedCampaigns) {
    if (!c.sharedHeygenId) continue;
    try {
      const { status, videoUrl, errorMessage } = await getAvatarVideoStatus(
        c.sharedHeygenId,
      );
      if (status === "completed" && videoUrl) {
        const buf = await downloadAvatarVideo(videoUrl);
        const relativeUrl = await writeBroadcastVideoToDisk(
          "shared",
          c.id,
          buf,
        );
        await prisma.$transaction([
          prisma.broadcastAvatarCampaign.update({
            where: { id: c.id },
            data: { sharedVideoUrl: relativeUrl, status: "READY" },
          }),
          prisma.broadcastAvatarDelivery.updateMany({
            where: { campaignId: c.id, status: "PENDING" },
            data: { status: "READY", videoUrl: relativeUrl },
          }),
        ]);
        stats.sharedReady += 1;
      } else if (status === "failed") {
        await prisma.broadcastAvatarCampaign.update({
          where: { id: c.id },
          data: {
            status: "FAILED",
            errorMessage: errorMessage?.slice(0, 500) ?? "heygen_failed",
          },
        });
        await prisma.broadcastAvatarDelivery.updateMany({
          where: { campaignId: c.id },
          data: {
            status: "FAILED",
            errorMessage: errorMessage?.slice(0, 500) ?? "heygen_failed",
          },
        });
        stats.sharedFailed += 1;
      }
    } catch (error: unknown) {
      stats.sharedFailed += 1;
      logError("AVATAR_BROADCAST", error, {
        area: "poll_shared",
        campaignId: c.id,
      });
    }
  }

  // ── Per-user deliveries waiting for HeyGen ───────────────────────────────
  const perUserDeliveries = await prisma.broadcastAvatarDelivery.findMany({
    where: {
      status: "PENDING",
      heygenVideoId: { not: null },
    },
    take: 50,
  });
  stats.perUserPending = perUserDeliveries.length;

  for (const d of perUserDeliveries) {
    if (!d.heygenVideoId) continue;
    try {
      const { status, videoUrl, errorMessage } = await getAvatarVideoStatus(
        d.heygenVideoId,
      );
      if (status === "completed" && videoUrl) {
        const buf = await downloadAvatarVideo(videoUrl);
        const relativeUrl = await writeBroadcastVideoToDisk(
          "deliveries",
          d.id,
          buf,
        );
        await prisma.broadcastAvatarDelivery.update({
          where: { id: d.id },
          data: { status: "READY", videoUrl: relativeUrl },
        });
        stats.perUserReady += 1;
      } else if (status === "failed") {
        await prisma.broadcastAvatarDelivery.update({
          where: { id: d.id },
          data: {
            status: "FAILED",
            errorMessage: errorMessage?.slice(0, 500) ?? "heygen_failed",
          },
        });
        stats.perUserFailed += 1;
      }
    } catch (error: unknown) {
      stats.perUserFailed += 1;
      logError("AVATAR_BROADCAST", error, {
        area: "poll_per_user",
        deliveryId: d.id,
      });
    }
  }

  // Mark per-user campaigns READY once all deliveries are resolved
  const generatingPerUserCampaigns = await prisma.broadcastAvatarCampaign.findMany({
    where: { isShared: false, status: "GENERATING" },
    select: { id: true },
  });
  for (const c of generatingPerUserCampaigns) {
    const remaining = await prisma.broadcastAvatarDelivery.count({
      where: { campaignId: c.id, status: "PENDING" },
    });
    if (remaining === 0) {
      await prisma.broadcastAvatarCampaign.update({
        where: { id: c.id },
        data: { status: "READY" },
      });
    }
  }

  logInfo("AVATAR_BROADCAST", "poll_complete", { ...stats });
  return stats;
}
