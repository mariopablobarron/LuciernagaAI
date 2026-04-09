import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { addReflection } from "@/services/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req);
    const { projectId } = await params;
    const body = (await req.json()) as {
      content?: string;
      type?: string;
      phase?: string;
    };
    const reflection = await addReflection(
      identity.userId,
      projectId,
      body.content!,
      body.type!,
      body.phase!,
    );
    return NextResponse.json({ reflection }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "POST /api/projects/[projectId]/reflections" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
