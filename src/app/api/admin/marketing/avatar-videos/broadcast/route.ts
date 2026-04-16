import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import {
  BroadcastLimitError,
  createBroadcast,
  processBroadcastCampaignAsync,
  type BroadcastMode,
} from "@/services/broadcastAvatarVideos";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:avatar_videos";

type CreatePayload = {
  title?: string;
  segment?: string;
  userEmail?: string;
  mode?: BroadcastMode;
  literalScript?: string;
  briefing?: string;
  isShared?: boolean;
};

/**
 * Creates a broadcast campaign and kicks off async processing.
 * Admin provides: title, targeting (segment | single + email), mode, content, shared flag.
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as CreatePayload;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    if (!body.segment) {
      return NextResponse.json({ error: "segment required" }, { status: 400 });
    }
    if (body.mode !== "literal" && body.mode !== "briefing") {
      return NextResponse.json(
        { error: "mode must be 'literal' or 'briefing'" },
        { status: 400 },
      );
    }
    if (body.mode === "literal" && !body.literalScript?.trim()) {
      return NextResponse.json(
        { error: "literalScript required when mode=literal" },
        { status: 400 },
      );
    }
    if (body.mode === "briefing" && !body.briefing?.trim()) {
      return NextResponse.json(
        { error: "briefing required when mode=briefing" },
        { status: 400 },
      );
    }
    if (body.segment === "single" && !body.userEmail?.trim()) {
      return NextResponse.json(
        { error: "userEmail required when segment=single" },
        { status: 400 },
      );
    }

    const result = await createBroadcast({
      title: body.title,
      segment: body.segment,
      userEmail: body.userEmail,
      mode: body.mode,
      literalScript: body.literalScript,
      briefing: body.briefing,
      isShared: body.isShared ?? true,
      createdBy: auth.adminName ?? auth.adminId ?? "unknown",
    });

    // Fire-and-forget: video generation runs in the background.
    processBroadcastCampaignAsync(result.campaignId);

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    if (error instanceof BroadcastLimitError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          details: error.details,
        },
        { status: 429 },
      );
    }
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "broadcast_POST" });
    return NextResponse.json(
      {
        error: "BROADCAST_FAILED",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}

/**
 * Lists recent broadcast campaigns with aggregate delivery status.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const campaigns = await prisma.broadcastAvatarCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        segment: true,
        mode: true,
        isShared: true,
        literalScript: true,
        briefing: true,
        sharedVideoUrl: true,
        status: true,
        errorMessage: true,
        recipientCount: true,
        createdAt: true,
        createdBy: true,
        deliveries: {
          select: { status: true, seenAt: true },
        },
      },
    });

    const campaignsWithStats = campaigns.map((c) => {
      const deliveryCounts = c.deliveries.reduce(
        (acc, d) => {
          acc[d.status] = (acc[d.status] ?? 0) + 1;
          if (d.seenAt) acc.SEEN += 1;
          return acc;
        },
        { PENDING: 0, READY: 0, FAILED: 0, SEEN: 0 } as Record<string, number>,
      );
      return {
        id: c.id,
        title: c.title,
        segment: c.segment,
        mode: c.mode,
        isShared: c.isShared,
        literalScript: c.literalScript,
        briefing: c.briefing,
        sharedVideoUrl: c.sharedVideoUrl,
        status: c.status,
        errorMessage: c.errorMessage,
        recipientCount: c.recipientCount,
        createdAt: c.createdAt,
        createdBy: c.createdBy,
        deliveryCounts,
      };
    });

    return NextResponse.json({ campaigns: campaignsWithStats });
  } catch (error: unknown) {
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "broadcast_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
