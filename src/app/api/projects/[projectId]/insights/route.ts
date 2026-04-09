import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { acknowledgeInsight } from "@/services/projects";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { insightId?: string };
    await acknowledgeInsight(identity.userId, body.insightId!);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("PROJECTS", e, { route: "POST /api/projects/[projectId]/insights" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
