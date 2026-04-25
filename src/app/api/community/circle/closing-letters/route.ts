import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/community/circle/closing-letters
// Returns all CircleClosingLetter rows belonging to the user. Permanent archive.
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const letters = await prisma.circleClosingLetter.findMany({
      where: { userId: identity.userId },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        reason: true,
        body: true,
        generatedAt: true,
        circle: { select: { name: true, matchPattern: true, matchEmotion: true } },
      },
    });

    return NextResponse.json({
      letters: letters.map((l) => ({
        id: l.id,
        reason: l.reason,
        body: l.body,
        generatedAt: l.generatedAt.toISOString(),
        circleName: l.circle.name,
        matchPattern: l.circle.matchPattern,
        matchEmotion: l.circle.matchEmotion,
      })),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circle/closing-letters" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
