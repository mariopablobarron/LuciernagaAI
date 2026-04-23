import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError } from "@/lib/logger";
import { submitResponse } from "@/services/circleSyncSessions";
import { assertNoPII } from "@/lib/pii-filters";

export const dynamic = "force-dynamic";

function unauthorized() {
  const res = NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
  clearSessionCookie(res);
  return res;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const identity = await resolveIdentity(req);
    const { sessionId } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      content?: string;
      anonymous?: boolean;
    };
    if (!body.content?.trim()) {
      return NextResponse.json(
        { success: false, error: "content required" },
        { status: 400 },
      );
    }

    const piiSync = assertNoPII(body.content);
    if (piiSync) {
      return NextResponse.json(
        { success: false, error: piiSync.code, message: piiSync.message, kinds: piiSync.kinds },
        { status: 422 },
      );
    }

    const result = await submitResponse({
      sessionId,
      userId: identity.userId,
      content: body.content,
      anonymous: body.anonymous ?? true,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.reason },
        { status: result.reason === "session_not_active" ? 410 : 400 },
      );
    }

    // If the response was flagged, return success but tell the client the
    // message is held for clinical review — don't leak what was blocked.
    const response = NextResponse.json({
      success: true,
      responseId: result.responseId,
      heldForReview: result.flagged,
    });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("CIRCLE_SYNC", error, { route: "respond_POST" });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
