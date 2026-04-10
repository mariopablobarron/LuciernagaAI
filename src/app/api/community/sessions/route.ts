import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await resolveIdentity(req);
    const prisma = getPrismaClient();

    const sessions = await prisma.liveSession.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: { in: ["scheduled", "live"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        hostName: true,
        hostRole: true,
        scheduledAt: true,
        durationMin: true,
        meetingUrl: true,
        isOpen: true,
        status: true,
        circle: { select: { id: true, name: true, phase: true } },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        scheduledAt: s.scheduledAt.toISOString(),
        circle: s.circle ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/sessions" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
