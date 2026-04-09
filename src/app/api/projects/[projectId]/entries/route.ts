import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { addPhaseEntryResponse } from "@/services/projects";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { entryId?: string; response?: string };
    const entry = await addPhaseEntryResponse(identity.userId, body.entryId!, body.response!);
    return NextResponse.json({ entry });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "POST /api/projects/[projectId]/entries" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
