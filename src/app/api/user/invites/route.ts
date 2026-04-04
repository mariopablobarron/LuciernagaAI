import { type NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, clearSessionCookie, InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { getUserInvites } from "@/services/invites";
import { logError } from "@/lib/logger";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const invitations = await getUserInvites(identity.userId);

    const response = NextResponse.json({
      ok: true,
      invites: invitations.map((inv) => ({
        code: inv.code,
        url: `${APP_BASE_URL}/i/${inv.code}`,
        used: !!inv.usedAt,
        usedByEmail: inv.usedByEmail,
        createdAt: inv.createdAt.toISOString(),
      })),
      total: invitations.length,
      available: invitations.filter((i) => !i.usedAt).length,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("INVITES", error, { action: "get_user_invites" });
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
