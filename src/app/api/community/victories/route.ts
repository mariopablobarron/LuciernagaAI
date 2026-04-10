import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await resolveIdentity(req);
    const prisma = getPrismaClient();

    const victories = await prisma.communityPost.findMany({
      where: { type: "victory", hidden: false },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        content: true,
        feeling: true,
        createdAt: true,
        likes: true,
        _count: { select: { heartbeats: true } },
      },
    });

    return NextResponse.json({
      victories: victories.map((v) => ({
        id: v.id,
        text: v.content || v.feeling || "",
        heartbeats: v._count.heartbeats + v.likes,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/victories" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
