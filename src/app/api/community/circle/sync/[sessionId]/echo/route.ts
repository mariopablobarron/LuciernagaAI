import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError } from "@/lib/logger";
import { recordEcho } from "@/services/circleSyncSessions";

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
 * Body: { responseId: string } — marks a "te escucho" on another user's
 * response. Consumes one of the daily 5 echo tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json().catch(() => ({}))) as { responseId?: string };
    if (!body.responseId) {
      return NextResponse.json(
        { success: false, error: "responseId required" },
        { status: 400 },
      );
    }

    const result = await recordEcho({
      responseId: body.responseId,
      userId: identity.userId,
    });

    if (!result.ok) {
      const status =
        result.reason === "quota_exceeded"
          ? 429
          : result.reason === "not_member" || result.reason === "cant_echo_self"
            ? 403
            : result.reason === "response_not_found"
              ? 404
              : 400;
      return NextResponse.json(
        { success: false, error: result.reason, remaining: result.remaining },
        { status },
      );
    }

    const response = NextResponse.json({
      success: true,
      remaining: result.remaining,
    });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("CIRCLE_SYNC", error, { route: "echo_POST" });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
