import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { listAvailableJourneys, assignJourneyToUser } from "@/services/journeys";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const journeys = await listAvailableJourneys(identity.userId);
    return NextResponse.json({ success: true, journeys });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    logError("JOURNEY", e, { route: "GET /api/journeys" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { journeySlug?: string };

    const result = await assignJourneyToUser(identity.userId, body.journeySlug);
    if (!result) {
      return NextResponse.json({ success: false, error: "Itinerario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, journey: result });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    logError("JOURNEY", e, { route: "POST /api/journeys" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
