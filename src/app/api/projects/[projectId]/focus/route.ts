import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { addFocusArea } from "@/services/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req);
    const { projectId } = await params;
    const body = (await req.json()) as { title?: string; description?: string };
    const focusArea = await addFocusArea(identity.userId, projectId, body.title!, body.description);
    return NextResponse.json({ focusArea }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "POST /api/projects/[projectId]/focus" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
