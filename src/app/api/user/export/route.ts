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
    const userId = identity.userId;

    // ── CSV shortcut (chat history only) ──────────────────────────────
    if (format === "csv") {
      const messages = await prisma.message.findMany({
        where: { userId },
        select: { role: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const header = "fecha,rol,contenido";
      const rows = messages.map(
        (m) =>
          `${m.createdAt.toISOString()},${m.role},"${m.content.replace(/"/g, '""')}"`
      );
      const csv = [header, ...rows].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="historial-${userId}.csv"`,
        },
      });
    }

    // ── Full GDPR JSON export ─────────────────────────────────────────
    const [
      user,
      conversations,
      goals,
      diaryEntries,
      dailyCheckins,
      streak,
      crisisEvents,
      userState,
      personalProjects,
      assessments,
      preferences,
      dailyLogs,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          lastSeen: true,
          messageCount: true,
          source: true,
          consentGiven: true,
          consentAt: true,
          phone: true,
        },
      }),
      prisma.conversation.findMany({
        where: { userId },
        include: {
          messageRecords: {
            select: { role: true, content: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.goal.findMany({
        where: { userId },
        include: { actions: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.diaryEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.dailyCheckin.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.streak.findUnique({ where: { userId } }),
      prisma.crisisEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userState.findUnique({ where: { userId } }),
      prisma.personalProject.findMany({
        where: { userId },
        include: {
          phaseEntries: true,
          focusAreas: { include: { steps: true } },
          reflections: true,
          insights: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.assessment.findMany({
        where: { userId },
        include: { response: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userPreferences.findUnique({ where: { userId } }),
      prisma.dailyLog.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = {
      exportedAt: new Date().toISOString(),
      user,
      streak,
      userState,
      preferences,
      conversations,
      goals,
      diaryEntries,
      dailyCheckins,
      dailyLogs,
      crisisEvents,
      personalProjects,
      assessments,
    };

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="datos-${userId}.json"`,
      },
    });
  } catch (error) {
    logError("EXPORT", error, { userId: identity.userId });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
