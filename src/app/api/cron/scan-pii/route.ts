import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { hasPII } from "@/lib/pii-filters";

// GET /api/cron/scan-pii?secret=CRON_SECRET
//
// Barrido retroactivo: escanea publicaciones visibles de comunidad en busca
// de PII que se publicó antes de activar el filtro en los endpoints POST.
// Marca hidden=true (soft-hide) los que tienen PII. No borra nada —
// moderación puede revisar luego.
//
// Cubre: CommunityPost, AnonQuestion, AnonAnswer, DailyRoundResponse,
// DailyRoundMirror. Usa dry-run por defecto; con ?apply=1 aplica los cambios.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apply = url.searchParams.get("apply") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 500), 2000);

  const prisma = getPrismaClient();
  const summary: Record<string, { scanned: number; flagged: number; ids: string[] }> = {
    community_posts: { scanned: 0, flagged: 0, ids: [] },
    anon_questions: { scanned: 0, flagged: 0, ids: [] },
    anon_answers: { scanned: 0, flagged: 0, ids: [] },
    daily_round_responses: { scanned: 0, flagged: 0, ids: [] },
    daily_round_mirrors: { scanned: 0, flagged: 0, ids: [] },
  };

  try {
    // ── CommunityPost ─────────────────────────────────────────────────────
    const posts = await prisma.communityPost.findMany({
      where: { hidden: false },
      select: { id: true, feeling: true, blocker: true, step: true, content: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    summary.community_posts.scanned = posts.length;
    const postsToHide: string[] = [];
    for (const p of posts) {
      if (hasPII(p.feeling) || hasPII(p.blocker) || hasPII(p.step) || hasPII(p.content)) {
        postsToHide.push(p.id);
      }
    }
    summary.community_posts.flagged = postsToHide.length;
    summary.community_posts.ids = postsToHide;
    if (apply && postsToHide.length > 0) {
      await prisma.communityPost.updateMany({
        where: { id: { in: postsToHide } },
        data: { hidden: true },
      });
    }

    // ── AnonQuestion ──────────────────────────────────────────────────────
    const questions = await prisma.anonQuestion.findMany({
      where: { hidden: false },
      select: { id: true, content: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    summary.anon_questions.scanned = questions.length;
    const qToHide = questions.filter((q) => hasPII(q.content)).map((q) => q.id);
    summary.anon_questions.flagged = qToHide.length;
    summary.anon_questions.ids = qToHide;
    if (apply && qToHide.length > 0) {
      await prisma.anonQuestion.updateMany({
        where: { id: { in: qToHide } },
        data: { hidden: true },
      });
    }

    // ── AnonAnswer ────────────────────────────────────────────────────────
    const answers = await prisma.anonAnswer.findMany({
      where: { hidden: false },
      select: { id: true, content: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    summary.anon_answers.scanned = answers.length;
    const aToHide = answers.filter((a) => hasPII(a.content)).map((a) => a.id);
    summary.anon_answers.flagged = aToHide.length;
    summary.anon_answers.ids = aToHide;
    if (apply && aToHide.length > 0) {
      await prisma.anonAnswer.updateMany({
        where: { id: { in: aToHide } },
        data: { hidden: true },
      });
    }

    // ── DailyRoundResponse ────────────────────────────────────────────────
    const drResponses = await prisma.dailyRoundResponse.findMany({
      where: { hidden: false },
      select: { id: true, content: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    summary.daily_round_responses.scanned = drResponses.length;
    const drToHide = drResponses.filter((r) => hasPII(r.content)).map((r) => r.id);
    summary.daily_round_responses.flagged = drToHide.length;
    summary.daily_round_responses.ids = drToHide;
    if (apply && drToHide.length > 0) {
      await prisma.dailyRoundResponse.updateMany({
        where: { id: { in: drToHide } },
        data: { hidden: true },
      });
    }

    // ── DailyRoundMirror ──────────────────────────────────────────────────
    const drMirrors = await prisma.dailyRoundMirror.findMany({
      where: { hidden: false },
      select: { id: true, question: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    summary.daily_round_mirrors.scanned = drMirrors.length;
    const drmToHide = drMirrors.filter((m) => hasPII(m.question)).map((m) => m.id);
    summary.daily_round_mirrors.flagged = drmToHide.length;
    summary.daily_round_mirrors.ids = drmToHide;
    if (apply && drmToHide.length > 0) {
      await prisma.dailyRoundMirror.updateMany({
        where: { id: { in: drmToHide } },
        data: { hidden: true },
      });
    }

    const totalFlagged = Object.values(summary).reduce((sum, s) => sum + s.flagged, 0);
    logInfo("COMMUNITY", "pii_scan_done", { apply, totalFlagged });

    return NextResponse.json({
      ok: true,
      apply,
      totalFlagged,
      summary,
    });
  } catch (error) {
    logError("COMMUNITY", error, { route: "/api/cron/scan-pii" });
    return NextResponse.json({ error: "SCAN_FAILED" }, { status: 500 });
  }
}
