import { type NextRequest, NextResponse } from "next/server";
import {
  resolveIdentity,
  InvalidSessionTokenError,
  attachSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { dispatchN8nEvent } from "@/lib/n8n";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - (Number.isFinite(days) && days > 0 ? days : 30));

    const prisma = getPrismaClient();
    const entries = await prisma.diaryEntry.findMany({
      where: { userId: identity.userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    const response = NextResponse.json({ entries });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("DIARY", error, { action: "list" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = await req.json();

    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const mood = typeof body.mood === "string" ? body.mood : undefined;
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t: unknown) => typeof t === "string")
      : [];

    const prisma = getPrismaClient();
    const entry = await prisma.diaryEntry.create({
      data: {
        userId: identity.userId,
        content,
        mood,
        tags,
      },
    });

    dispatchN8nEvent("diary.entry", { mood, tags }, identity.userId);

    const response = NextResponse.json({ entry }, { status: 201 });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("DIARY", error, { action: "create" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
