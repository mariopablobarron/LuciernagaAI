import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { addStep, completeStep } from "@/services/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string; focusId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req);
    const { focusId } = await params;
    const body = (await req.json()) as { description?: string; dueDate?: string };
    const step = await addStep(identity.userId, focusId, body.description!, body.dueDate ? new Date(body.dueDate) : undefined);
    return NextResponse.json({ step }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "POST /api/projects/[projectId]/focus/[focusId]/steps" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { stepId?: string; reflection?: string };
    const step = await completeStep(identity.userId, body.stepId!, body.reflection);
    return NextResponse.json({ step });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "PATCH /api/projects/[projectId]/focus/[focusId]/steps" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
