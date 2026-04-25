import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_LEN = 1500;

// POST /api/community/circle/pulse/[pulseId]/respond  { content: string }
// Creates the user's response to the pulse, or edits it if it exists and the
// pulse is still open. Each user can submit exactly one response per pulse
// (enforced by the unique index on pulseId+userId).
export async function POST(req: NextRequest, { params }: { params: Promise<{ pulseId: string }> }) {
  try {
    const identity = await resolveIdentity(req);
    const { pulseId } = await params;
    const body = (await req.json().catch(() => null)) as { content?: string } | null;
    const content = body?.content?.trim();
    if (!content || content.length === 0) {
      return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
    }
    if (content.length > MAX_LEN) {
      return NextResponse.json({ error: "CONTENT_TOO_LONG", maxLen: MAX_LEN }, { status: 400 });
    }

    const prisma = getPrismaClient();

    const pulse = await prisma.circlePulse.findUnique({
      where: { id: pulseId },
      select: { id: true, status: true, weekEnd: true, circleId: true },
    });
    if (!pulse) {
      return NextResponse.json({ error: "PULSE_NOT_FOUND" }, { status: 404 });
    }
    if (pulse.status !== "open" || pulse.weekEnd.getTime() <= Date.now()) {
      return NextResponse.json({ error: "PULSE_CLOSED" }, { status: 409 });
    }

    const membership = await prisma.circleMember.findFirst({
      where: { userId: identity.userId, circleId: pulse.circleId, leftAt: null },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });
    }

    const existing = await prisma.circlePulseResponse.findUnique({
      where: { pulseId_userId: { pulseId, userId: identity.userId } },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.circlePulseResponse.update({
          where: { id: existing.id },
          data: { content, editedAt: new Date() },
          select: { id: true, content: true, submittedAt: true, editedAt: true },
        })
      : await prisma.circlePulseResponse.create({
          data: { pulseId, userId: identity.userId, content },
          select: { id: true, content: true, submittedAt: true, editedAt: true },
        });

    logInfo("COMMUNITY", "pulse_response", { pulseId, userId: identity.userId, edited: Boolean(existing) });

    return NextResponse.json({
      response: {
        id: saved.id,
        content: saved.content,
        submittedAt: saved.submittedAt.toISOString(),
        editedAt: saved.editedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circle/pulse/[pulseId]/respond" });
    return NextResponse.json({ error: "RESPOND_FAILED" }, { status: 500 });
  }
}
