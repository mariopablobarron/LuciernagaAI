import { NextResponse, type NextRequest } from "next/server";
import { resolveIdentity, attachSessionCookie, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

/**
 * GET /api/weekly-letter/pending
 *
 * Returns the unread, published weekly letter for the current user (if any).
 * Letters generated in dry-run (`published=false`) are never returned here.
 */
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const letter = await prisma.weeklyLetter.findFirst({
      where: {
        userId: identity.userId,
        published: true,
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        body: true,
        state: true,
        weekStart: true,
        weekEnd: true,
        createdAt: true,
      },
    });

    const response = NextResponse.json({ letter });
    attachSessionCookie(response, identity.sessionToken);
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("WEEKLY_LETTER", error, { route: "GET /api/weekly-letter/pending" });
    return NextResponse.json({ letter: null });
  }
}
