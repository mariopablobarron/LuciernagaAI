import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getJourneyMap } from "@/services/journeys";

type Params = { params: Promise<{ journeyId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const { journeyId } = await params;
    const map = await getJourneyMap(identity.userId, journeyId);

    if (!map) {
      return NextResponse.json({ success: false, error: "Itinerario no encontrado" }, { status: 404 });
    }

    const res = NextResponse.json({ success: true, journey: map });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (e: unknown) {
    logError("JOURNEY", e, { route: "GET /api/journeys/[journeyId]" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
