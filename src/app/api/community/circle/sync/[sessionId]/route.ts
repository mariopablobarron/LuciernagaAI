import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getSessionDetailForUser } from "@/services/circleSyncSessions";

export const dynamic = "force-dynamic";

function unauthorized() {
  const res = NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
  clearSessionCookie(res);
  return res;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const identity = await resolveIdentity(req);
    const { sessionId } = await params;
    const detail = await getSessionDetailForUser(sessionId, identity.userId);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: "not_found_or_not_member" },
        { status: 404 },
      );
    }
    const response = NextResponse.json({ success: true, session: detail });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("CIRCLE_SYNC", error, { route: "detail_GET" });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
