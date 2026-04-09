import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  getProjectDetail,
  updateProjectPhase,
  updateProjectStatus,
} from "@/services/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req);
    const { projectId } = await params;
    const project = await getProjectDetail(identity.userId, projectId);
    return NextResponse.json({ project });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "GET /api/projects/[projectId]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req);
    const { projectId } = await params;
    const body = (await req.json()) as { phase?: string; status?: string };

    let project;
    if (body.phase) {
      project = await updateProjectPhase(identity.userId, projectId, body.phase as import("@/domain/projects/types").ProjectPhase);
    }
    if (body.status) {
      project = await updateProjectStatus(identity.userId, projectId, body.status);
    }

    return NextResponse.json({ project });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "PATCH /api/projects/[projectId]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
