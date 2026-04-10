import { type NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getBadgeDefinitions, getUserBadges } from "@/services/badges";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);

    const [badges, definitions] = await Promise.all([
      getUserBadges(identity.userId),
      getBadgeDefinitions(identity.userId),
    ]);

    const response = NextResponse.json({
      ok: true,
      badges,
      definitions,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
      clearSessionCookie(res);
      return res;
    }
    logError("BADGES_API", error, { action: "get_user_badges" });
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 },
    );
  }
}
