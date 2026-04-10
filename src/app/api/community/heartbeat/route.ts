import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { postId } = (await req.json()) as { postId?: string };
    if (!postId) return NextResponse.json({ error: "POST_ID_REQUIRED" }, { status: 400 });

    const prisma = getPrismaClient();

    const existing = await prisma.heartbeat.findUnique({
      where: { postId_userId: { postId, userId: identity.userId } },
    });

    if (existing) {
      await prisma.heartbeat.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, action: "removed" });
    }

    await prisma.heartbeat.create({
      data: { postId, userId: identity.userId },
    });
    return NextResponse.json({ success: true, action: "added" });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/heartbeat" });
    return NextResponse.json({ error: "HEARTBEAT_FAILED" }, { status: 500 });
  }
}
