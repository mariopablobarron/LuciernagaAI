import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getActiveProject } from "@/services/projects";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const project = await getActiveProject(identity.userId);
    return NextResponse.json({ project });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "GET /api/projects/active" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
