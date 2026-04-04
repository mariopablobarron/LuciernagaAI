import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { createPortalSession } from "@/services/billing";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const portalUrl = await createPortalSession(identity.userId);
    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    logError("BILLING", error, { route: "/api/billing/portal" });
    return NextResponse.json({ error: "PORTAL_FAILED" }, { status: 500 });
  }
}
