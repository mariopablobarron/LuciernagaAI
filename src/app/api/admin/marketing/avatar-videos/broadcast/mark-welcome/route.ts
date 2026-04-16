import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:avatar_videos";

/**
 * Marks a broadcast campaign as the welcome template, or unsets it.
 * Body: { campaignId: string | null }
 *
 * The campaign must be READY with a sharedVideoUrl, otherwise the welcome
 * trigger would silently no-op for new signups.
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as { campaignId?: string | null };
    const prisma = getPrismaClient();

    if (body.campaignId) {
      const campaign = await prisma.broadcastAvatarCampaign.findUnique({
        where: { id: body.campaignId },
        select: { id: true, status: true, sharedVideoUrl: true, isShared: true },
      });
      if (!campaign) {
        return NextResponse.json(
          { error: "campaign not found" },
          { status: 404 },
        );
      }
      if (!campaign.isShared) {
        return NextResponse.json(
          { error: "campaign must be shared (isShared=true) to be a welcome template" },
          { status: 400 },
        );
      }
      if (campaign.status !== "READY" || !campaign.sharedVideoUrl) {
        return NextResponse.json(
          { error: "campaign must be READY with sharedVideoUrl before marking as welcome" },
          { status: 400 },
        );
      }
    }

    await prisma.avatarVideoConfig.update({
      where: { id: "singleton" },
      data: {
        welcomeCampaignId: body.campaignId ?? null,
        updatedBy: auth.adminName ?? auth.adminId ?? "unknown",
      },
    });

    logInfo("ADMIN_AVATAR_VIDEOS", "welcome_template_set", {
      campaignId: body.campaignId,
      by: auth.adminName,
    });

    return NextResponse.json({ ok: true, welcomeCampaignId: body.campaignId ?? null });
  } catch (error: unknown) {
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "mark_welcome_POST" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
