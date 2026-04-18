import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getCurrentSessionForUser } from "@/services/circleSyncSessions";

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
 * Returns the sessionId of the current user's circle sync session, if any
 * is active or scheduled within the next 2 hours.
 */
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const sessionId = await getCurrentSessionForUser(identity.userId);

    const response = NextResponse.json({ success: true, sessionId });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("CIRCLE_SYNC", error, { route: "current_GET" });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
