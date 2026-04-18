import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

function unauthorized() {
  const res = NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
  clearSessionCookie(res);
  return res;
}

/**
 * Returns the user's unresolved interventions (status != "resolved"),
 * ordered oldest first so the user addresses them in sequence.
 *
 * An intervention is a message from the clinical team or the automated
 * triage system. It appears to the user once, with visibility preference,
 * until they acknowledge it.
 */
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const interventions = await prisma.intervention.findMany({
      where: {
        userId: identity.userId,
        status: { not: "resolved" },
      },
      orderBy: { sentAt: "asc" },
      select: {
        id: true,
        type: true,
        content: true,
        status: true,
        sentAt: true,
        adminId: true,
      },
    });

    const response = NextResponse.json({ success: true, interventions });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("USER_INTERVENTIONS", error, {
      route: "/api/user/interventions",
      method: "GET",
    });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}

/**
 * Updates an intervention's status. Body: { id: string, status: "read" | "resolved" }.
 * Only the owner of the intervention can update it.
 */
export async function PATCH(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      status?: "read" | "resolved";
    };
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "id required" },
        { status: 400 },
      );
    }
    if (body.status !== "read" && body.status !== "resolved") {
      return NextResponse.json(
        { success: false, error: "status must be 'read' or 'resolved'" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const now = new Date();
    const result = await prisma.intervention.updateMany({
      where: { id: body.id, userId: identity.userId },
      data: {
        status: body.status,
        ...(body.status === "read" ? { readAt: now } : {}),
      },
    });

    if (result.count > 0) {
      logInfo("USER_INTERVENTIONS", "status_updated", {
        id: body.id,
        userId: identity.userId,
        status: body.status,
      });
    }

    const response = NextResponse.json({ success: true, updated: result.count });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("USER_INTERVENTIONS", error, {
      route: "/api/user/interventions",
      method: "PATCH",
    });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
