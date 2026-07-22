import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getActiveJourney } from "@/services/journeys";

export async function GET(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const journey = await getActiveJourney(identity.userId);
    const res = NextResponse.json({ success: true, journey });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (e: unknown) {
    logError("JOURNEY", e, { route: "GET /api/journeys/active" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
