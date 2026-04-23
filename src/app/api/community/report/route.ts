import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logInfo, logError } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";

export const dynamic = "force-dynamic";

const VALID_REASONS = ["harmful", "self_harm", "harassment", "spam", "personal_data", "other"];
const AUTO_HIDE_THRESHOLD = 3;
const MAX_REPORTS_PER_DAY = 5;

type TargetKind = "post" | "question" | "answer" | "daily_response" | "daily_mirror";

/**
 * POST /api/community/report — report a community post, anon question/answer,
 * or a daily round response/mirror. Exactly one target ID must be provided.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      postId?: string;
      anonQuestionId?: string;
      anonAnswerId?: string;
      dailyRoundResponseId?: string;
      dailyRoundMirrorId?: string;
      reason?: string;
      details?: string;
    };

    const targets = [
      body.postId,
      body.anonQuestionId,
      body.anonAnswerId,
      body.dailyRoundResponseId,
      body.dailyRoundMirrorId,
    ].filter(Boolean);
    if (targets.length !== 1) {
      return NextResponse.json(
        { error: "Exactamente uno de los IDs de target es requerido" },
        { status: 400 },
      );
    }
    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json(
        { error: "reason (harmful|self_harm|harassment|spam|personal_data|other) requerido" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const reportsToday = await prisma.communityReport.count({
      where: { reporterId: identity.userId, createdAt: { gte: todayStart } },
    });
    if (reportsToday >= MAX_REPORTS_PER_DAY) {
      return NextResponse.json(
        { error: `Maximo ${MAX_REPORTS_PER_DAY} reportes por dia` },
        { status: 429 },
      );
    }

    let snippet = "";
    let targetKind: TargetKind;
    if (body.postId) {
      const post = await prisma.communityPost.findUnique({
        where: { id: body.postId },
        select: { id: true, content: true, feeling: true },
      });
      if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
      snippet = (post.content ?? post.feeling ?? "").slice(0, 100);
      targetKind = "post";
    } else if (body.anonQuestionId) {
      const q = await prisma.anonQuestion.findUnique({
        where: { id: body.anonQuestionId },
        select: { id: true, content: true },
      });
      if (!q) return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
      snippet = q.content.slice(0, 100);
      targetKind = "question";
    } else if (body.anonAnswerId) {
      const a = await prisma.anonAnswer.findUnique({
        where: { id: body.anonAnswerId },
        select: { id: true, content: true },
      });
      if (!a) return NextResponse.json({ error: "Respuesta no encontrada" }, { status: 404 });
      snippet = a.content.slice(0, 100);
      targetKind = "answer";
    } else if (body.dailyRoundResponseId) {
      const r = await prisma.dailyRoundResponse.findUnique({
        where: { id: body.dailyRoundResponseId },
        select: { id: true, content: true },
      });
      if (!r) return NextResponse.json({ error: "Respuesta no encontrada" }, { status: 404 });
      snippet = r.content.slice(0, 100);
      targetKind = "daily_response";
    } else {
      const m = await prisma.dailyRoundMirror.findUnique({
        where: { id: body.dailyRoundMirrorId! },
        select: { id: true, question: true },
      });
      if (!m) return NextResponse.json({ error: "Espejo no encontrado" }, { status: 404 });
      snippet = m.question.slice(0, 100);
      targetKind = "daily_mirror";
    }

    const report = await prisma.communityReport.create({
      data: {
        postId: body.postId ?? null,
        anonQuestionId: body.anonQuestionId ?? null,
        anonAnswerId: body.anonAnswerId ?? null,
        dailyRoundResponseId: body.dailyRoundResponseId ?? null,
        dailyRoundMirrorId: body.dailyRoundMirrorId ?? null,
        reporterId: identity.userId,
        reason: body.reason,
        details: body.details?.trim().slice(0, 500) || null,
        status: "pending",
      },
    });

    logInfo("COMMUNITY", "item_reported", {
      reportId: report.id,
      targetKind,
      reason: body.reason,
      reporterId: identity.userId,
    });

    const pendingFilter: Record<string, unknown> = { status: "pending" };
    if (body.postId) pendingFilter.postId = body.postId;
    else if (body.anonQuestionId) pendingFilter.anonQuestionId = body.anonQuestionId;
    else if (body.anonAnswerId) pendingFilter.anonAnswerId = body.anonAnswerId;
    else if (body.dailyRoundResponseId) pendingFilter.dailyRoundResponseId = body.dailyRoundResponseId;
    else pendingFilter.dailyRoundMirrorId = body.dailyRoundMirrorId;

    const totalReports = await prisma.communityReport.count({ where: pendingFilter });

    if (totalReports >= AUTO_HIDE_THRESHOLD) {
      if (body.postId) {
        await prisma.communityPost.update({ where: { id: body.postId }, data: { hidden: true } });
      } else if (body.anonQuestionId) {
        await prisma.anonQuestion.update({ where: { id: body.anonQuestionId }, data: { hidden: true } });
      } else if (body.anonAnswerId) {
        await prisma.anonAnswer.update({ where: { id: body.anonAnswerId }, data: { hidden: true } });
      } else if (body.dailyRoundResponseId) {
        await prisma.dailyRoundResponse.update({
          where: { id: body.dailyRoundResponseId },
          data: { hidden: true },
        });
      } else {
        await prisma.dailyRoundMirror.update({
          where: { id: body.dailyRoundMirrorId! },
          data: { hidden: true },
        });
      }
      logInfo("COMMUNITY", "item_auto_hidden", { targetKind, totalReports });
    }

    if (body.reason === "self_harm") {
      const label =
        targetKind === "post" ? `Post \`${body.postId}\`` :
        targetKind === "question" ? `Pregunta \`${body.anonQuestionId}\`` :
        targetKind === "answer" ? `Respuesta \`${body.anonAnswerId}\`` :
        targetKind === "daily_response" ? `Ronda / respuesta \`${body.dailyRoundResponseId}\`` :
        `Ronda / espejo \`${body.dailyRoundMirrorId}\``;
      notifyAdmin(
        `🚨 *Reporte de autolesion en comunidad*\n\n${label}\nContenido: _${snippet}_\nReportes totales: ${totalReports}`,
      );
    }

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      autoHidden: totalReports >= AUTO_HIDE_THRESHOLD,
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/report" });
    return NextResponse.json({ error: "REPORT_FAILED" }, { status: 500 });
  }
}
