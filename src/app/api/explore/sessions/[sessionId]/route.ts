import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const prisma = getPrismaClient();

    const session = await prisma.exploreSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await req.json();
    const prisma = getPrismaClient();

    const {
      completedActions,
      emotionalState,
      responses,
      sessionNotes,
      completedAt,
    } = body;

    const session = await prisma.exploreSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const updatedCompletedActions = completedActions || session.completedActions;
    const progressPercent = Math.round(
      (updatedCompletedActions.length / session.totalActions) * 100
    );

    const updated = await prisma.exploreSession.update({
      where: { sessionId },
      data: {
        ...(completedActions && { completedActions: updatedCompletedActions }),
        ...(emotionalState && { emotionalState }),
        ...(responses && {
          responses: { ...session.responses, ...responses },
        }),
        ...(sessionNotes && { sessionNotes }),
        ...(completedAt && { completedAt }),
        progressPercent,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
