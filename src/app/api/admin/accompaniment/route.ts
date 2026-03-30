import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { buildAccompanimentList, sendInterventionMessage } from "@/services/accompaniment";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminAuth = resolveAdminAuth(req);
    if (!adminAuth.authenticated) {
      const unauthorized = NextResponse.json(
        { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
        { status: 401 }
      );
      if (adminAuth.source === "invalid") clearAdminSessionCookie(unauthorized);
      return unauthorized;
    }

    const items = await buildAccompanimentList();
    return NextResponse.json({ items });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "GET /api/admin/accompaniment" });
    return NextResponse.json(
      { error: "ACCOMPANIMENT_FAILED", message: "No se pudo cargar el modo acompañamiento." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminAuth = resolveAdminAuth(req);
    if (!adminAuth.authenticated) {
      const unauthorized = NextResponse.json(
        { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
        { status: 401 }
      );
      if (adminAuth.source === "invalid") clearAdminSessionCookie(unauthorized);
      return unauthorized;
    }

    const body = (await req.json()) as { userId?: string; message?: string };
    const { userId, message } = body;

    if (!userId || !message?.trim()) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "userId y message son requeridos." },
        { status: 400 }
      );
    }

    await sendInterventionMessage(userId, message.trim());
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "POST /api/admin/accompaniment" });
    return NextResponse.json(
      { error: "INTERVENTION_FAILED", message: "No se pudo enviar la intervención." },
      { status: 500 }
    );
  }
}
