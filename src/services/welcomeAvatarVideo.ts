import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

/**
 * Triggers the welcome avatar video for a freshly created user.
 *
 * Reuses the broadcast infrastructure: an admin marks one
 * BroadcastAvatarCampaign as the "welcome template" via
 * AvatarVideoConfig.welcomeCampaignId. When a new user signs up, this
 * helper creates a new BroadcastAvatarDelivery row for them pointing at
 * the campaign's already-generated sharedVideoUrl. No HeyGen calls, no
 * extra cost, no per-user generation — the same video plays for every
 * new signup until the admin updates the template.
 *
 * Silently no-ops if:
 *  - Avatar video system is disabled
 *  - No welcomeCampaignId is configured
 *  - The configured campaign is missing, not READY, or has no sharedVideoUrl
 *  - The user has opted out
 *  - A delivery already exists (idempotent for retries)
 */
export async function triggerWelcomeAvatarVideo(userId: string): Promise<void> {
  const prisma = getPrismaClient();

  const config = await prisma.avatarVideoConfig.findUnique({
    where: { id: "singleton" },
    select: { enabled: true, welcomeCampaignId: true },
  });
  if (!config?.enabled || !config.welcomeCampaignId) return;

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { avatarVideosEnabled: true },
  });
  if (prefs && !prefs.avatarVideosEnabled) return;

  const campaign = await prisma.broadcastAvatarCampaign.findUnique({
    where: { id: config.welcomeCampaignId },
    select: {
      id: true,
      status: true,
      sharedVideoUrl: true,
      literalScript: true,
    },
  });
  if (
    !campaign ||
    campaign.status !== "READY" ||
    !campaign.sharedVideoUrl
  ) {
    logInfo("AVATAR_WELCOME", "skipped_template_not_ready", {
      userId,
      campaignId: config.welcomeCampaignId,
      status: campaign?.status,
    });
    return;
  }

  try {
    await prisma.broadcastAvatarDelivery.upsert({
      where: {
        campaignId_userId: { campaignId: campaign.id, userId },
      },
      create: {
        campaignId: campaign.id,
        userId,
        script: campaign.literalScript ?? "",
        videoUrl: campaign.sharedVideoUrl,
        status: "READY",
      },
      update: {}, // idempotent: do nothing if already exists
    });

    logInfo("AVATAR_WELCOME", "delivery_created", {
      userId,
      campaignId: campaign.id,
    });
  } catch (error: unknown) {
    logError("AVATAR_WELCOME", error, {
      area: "trigger",
      userId,
      campaignId: campaign.id,
    });
  }
}

/**
 * Fire-and-forget wrapper. Never throws; safe to call from request paths.
 */
export function triggerWelcomeAvatarVideoAsync(userId: string): void {
  triggerWelcomeAvatarVideo(userId).catch((error: unknown) => {
    logError("AVATAR_WELCOME", error, { area: "async_trigger", userId });
  });
}
