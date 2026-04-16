import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

function unauthorized() {
  const res = NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
  clearSessionCookie(res);
  return res;
}

/**
 * Toggles weekly avatar videos for the caller. Body: { enabled: boolean }.
 * When enabled=false, the weekly cron will skip this user entirely.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "enabled (boolean) required" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    await prisma.userPreferences.upsert({
      where: { userId: identity.userId },
      create: { userId: identity.userId, avatarVideosEnabled: body.enabled },
      update: { avatarVideosEnabled: body.enabled },
    });

    logInfo("AVATAR_WEEKLY", "opt_out_toggled", {
      userId: identity.userId,
      enabled: body.enabled,
    });

    const response = NextResponse.json({ success: true, enabled: body.enabled });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("AVATAR_WEEKLY", error, { route: "/api/avatar/weekly/opt-out" });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
