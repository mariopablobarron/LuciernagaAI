import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const prisma = getPrismaClient();

  try {
    const [user, messages, dailyLogs, goals, streak] = await Promise.all([
      prisma.user.findUnique({
        where: { id: identity.userId },
        select: { id: true, email: true, name: true, createdAt: true, messageCount: true },
      }),
      prisma.message.findMany({
        where: { userId: identity.userId },
        select: { role: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.dailyLog.findMany({
        where: { userId: identity.userId },
        select: { mood: true, note: true, emotionalState: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.goal.findMany({
        where: { userId: identity.userId },
        select: { title: true, status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.streak.findUnique({
        where: { userId: identity.userId },
        select: { currentDays: true, bestDays: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (format === "csv") {
      const header = "fecha,rol,contenido";
      const rows = messages.map(
        (m) =>
          `${m.createdAt.toISOString()},${m.role},"${m.content.replace(/"/g, '""')}"`
      );
      const csv = [header, ...rows].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="historial-${identity.userId}.csv"`,
        },
      });
    }

    // JSON format — full data export
    const data = {
      exportedAt: new Date().toISOString(),
      user: { ...user, streak },
      messages,
      dailyLogs,
      goals,
    };

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="datos-${identity.userId}.json"`,
      },
    });
  } catch (error) {
    logError("EXPORT", error, { userId: identity.userId });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
