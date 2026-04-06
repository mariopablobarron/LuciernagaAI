import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getActiveJourney } from "@/services/journeys";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const journey = await getActiveJourney(identity.userId);
    return NextResponse.json({ success: true, journey });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    logError("JOURNEY", e, { route: "GET /api/journeys/active" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
