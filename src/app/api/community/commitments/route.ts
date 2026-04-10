import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { searchParams } = new URL(req.url);
    const circleId = searchParams.get("circleId");
    if (!circleId) return NextResponse.json({ error: "CIRCLE_ID_REQUIRED" }, { status: 400 });

    const prisma = getPrismaClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commitments = await prisma.dailyCommitment.findMany({
      where: { circleId, date: today },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      commitments: commitments.map((c) => ({
        id: c.id,
        text: c.text,
        completed: c.completed,
        author: c.user.name,
        isOwn: c.userId === identity.userId,
      })),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/commitments" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { circleId, text, completed } = (await req.json()) as {
      circleId?: string;
      text?: string;
      completed?: boolean;
    };

    if (!circleId) return NextResponse.json({ error: "CIRCLE_ID_REQUIRED" }, { status: 400 });

    const prisma = getPrismaClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (typeof completed === "boolean") {
      // Toggle completion
      await prisma.dailyCommitment.updateMany({
        where: { userId: identity.userId, circleId, date: today },
        data: { completed },
      });
      return NextResponse.json({ success: true, action: "toggled" });
    }

    if (!text?.trim()) return NextResponse.json({ error: "TEXT_REQUIRED" }, { status: 400 });

    await prisma.dailyCommitment.upsert({
      where: { userId_circleId_date: { userId: identity.userId, circleId, date: today } },
      create: { userId: identity.userId, circleId, text: text.trim().slice(0, 300), date: today },
      update: { text: text.trim().slice(0, 300) },
    });

    return NextResponse.json({ success: true, action: "saved" });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/commitments", method: "POST" });
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
}
