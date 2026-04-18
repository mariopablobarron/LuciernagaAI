import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/daily-round?days=14&includeHidden=1
 * Devuelve las rondas de los últimos N días con sus respuestas (content,
 * autor, hidden, reports count) y mirrors. Para moderación.
 */
export async function GET(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Number(searchParams.get("days") ?? 14), 1), 60);
    const includeHidden = searchParams.get("includeHidden") === "1";
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const prisma = getPrismaClient();

    const rounds = await prisma.dailyRound.findMany({
      where: { date: { gte: since } },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        prompt: true,
        responses: {
          where: includeHidden ? undefined : { hidden: false },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            anonymous: true,
            hidden: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
            _count: { select: { reports: { where: { status: "pending" } } } },
            mirrors: {
              where: includeHidden ? undefined : { hidden: false },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                question: true,
                hidden: true,
                createdAt: true,
                author: { select: { id: true, name: true, email: true } },
                _count: { select: { reports: { where: { status: "pending" } } } },
              },
            },
          },
        },
      },
    });

    const formatted = rounds.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      prompt: r.prompt,
      responses: r.responses.map((resp) => ({
        id: resp.id,
        content: resp.content,
        anonymous: resp.anonymous,
        hidden: resp.hidden,
        createdAt: resp.createdAt.toISOString(),
        user: resp.user,
        reportCount: resp._count.reports,
        mirrors: resp.mirrors.map((m) => ({
          id: m.id,
          question: m.question,
          hidden: m.hidden,
          createdAt: m.createdAt.toISOString(),
          author: m.author,
          reportCount: m._count.reports,
        })),
      })),
    }));

    return NextResponse.json({ rounds: formatted });
  } catch (error) {
    logError("ADMIN", error, { route: "/api/admin/daily-round", method: "GET" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/daily-round
 * Body: { kind: "response" | "mirror", id: string, hidden: boolean }
 * Oculta o reexpone una respuesta o espejo. También marca los reportes
 * pendientes asociados como "reviewed".
 */
export async function PATCH(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      kind?: "response" | "mirror";
      id?: string;
      hidden?: boolean;
    };
    if (!body.id || (body.kind !== "response" && body.kind !== "mirror")) {
      return NextResponse.json({ error: "BAD_PARAMS" }, { status: 400 });
    }
    const hidden = Boolean(body.hidden);

    const prisma = getPrismaClient();
    if (body.kind === "response") {
      await prisma.dailyRoundResponse.update({ where: { id: body.id }, data: { hidden } });
      await prisma.communityReport.updateMany({
        where: { dailyRoundResponseId: body.id, status: "pending" },
        data: { status: "reviewed" },
      });
    } else {
      await prisma.dailyRoundMirror.update({ where: { id: body.id }, data: { hidden } });
      await prisma.communityReport.updateMany({
        where: { dailyRoundMirrorId: body.id, status: "pending" },
        data: { status: "reviewed" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("ADMIN", error, { route: "/api/admin/daily-round", method: "PATCH" });
    return NextResponse.json({ error: "PATCH_FAILED" }, { status: 500 });
  }
}
