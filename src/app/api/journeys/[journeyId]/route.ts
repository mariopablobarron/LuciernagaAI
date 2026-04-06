import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getJourneyMap } from "@/services/journeys";

type Params = { params: Promise<{ journeyId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req);
    const { journeyId } = await params;
    const map = await getJourneyMap(identity.userId, journeyId);

    if (!map) {
      return NextResponse.json({ success: false, error: "Itinerario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, journey: map });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    logError("JOURNEY", e, { route: "GET /api/journeys/[journeyId]" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
