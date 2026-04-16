import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { getBroadcastLimitState } from "@/services/broadcastAvatarVideos";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:avatar_videos";

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const limits = await getBroadcastLimitState();
    return NextResponse.json({ limits });
  } catch (error: unknown) {
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "broadcast_limits_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
