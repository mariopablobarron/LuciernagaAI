import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { clearUserCrisis, getUserCrisisStatus } from "@/services/state";
import { trackSafe } from "@/services/events";

export async function POST(req: NextRequest) {
  let identity: Awaited<ReturnType<typeof resolveIdentity>>;

  try {
    identity = await resolveIdentity(req);
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      const res = NextResponse.json(
        { success: false, error: "Token inválido o expirado" },
        { status: 401 }
      );
      clearSessionCookie(res);
      return res;
    }
    logError("CRISIS", e, { route: "/api/user/crisis-exit", method: "POST" });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }

  try {
    const crisisStatus = await getUserCrisisStatus(identity.userId);

    if (!crisisStatus.active) {
      const res = NextResponse.json(
        { success: true, cleared: false, message: "No había estado de crisis activo." },
        { status: 200 }
      );
      if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
      return res;
    }

    await clearUserCrisis(identity.userId);
    await trackSafe({
      userId: identity.userId,
      type: "CRISIS_EXITED",
      metadata: { method: "user_explicit_exit", source: "api" },
    });

    logInfo("CRISIS", "crisis_manually_cleared", { userId: identity.userId });

    const res = NextResponse.json(
      {
        success: true,
        cleared: true,
        message: "Estado de crisis cerrado. Puedes continuar tu conversación.",
      },
      { status: 200 }
    );
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (error: unknown) {
    logError("CRISIS", error, { route: "/api/user/crisis-exit", userId: identity.userId });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
