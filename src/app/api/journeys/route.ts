import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { listAvailableJourneys, assignJourneyToUser } from "@/services/journeys";

export async function GET(req: NextRequest) {
  try {
    // Bootstrap anónimo: un usuario que aterriza en /journey sin haber pasado
    // por el chat también debe poder ver los itinerarios (mismo patrón que
    // /api/chat, /api/quiz/result). Antes daba 401 silencioso → 0 journeys.
    const identity = await bootstrapSessionIdentity(req);
    const journeys = await listAvailableJourneys(identity.userId);
    const res = NextResponse.json({ success: true, journeys });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (e: unknown) {
    logError("JOURNEY", e, { route: "GET /api/journeys" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const body = (await req.json()) as { journeySlug?: string };

    const result = await assignJourneyToUser(identity.userId, body.journeySlug);
    if (!result) {
      return NextResponse.json({ success: false, error: "Itinerario no encontrado" }, { status: 404 });
    }

    const res = NextResponse.json({ success: true, journey: result });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (e: unknown) {
    logError("JOURNEY", e, { route: "POST /api/journeys" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
