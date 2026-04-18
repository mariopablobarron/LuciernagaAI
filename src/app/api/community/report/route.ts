import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logInfo, logError } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";

export const dynamic = "force-dynamic";

const VALID_REASONS = ["harmful", "self_harm", "harassment", "spam", "other"];
const AUTO_HIDE_THRESHOLD = 3;
const MAX_REPORTS_PER_DAY = 5;

/**
 * POST /api/community/report — report a community post, anon question or anon answer.
 * Body: { postId? | anonQuestionId? | anonAnswerId?, reason, details? }
 * Exactly one of the three target IDs must be provided.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      postId?: string;
      anonQuestionId?: string;
      anonAnswerId?: string;
      reason?: string;
      details?: string;
    };

    const targets = [body.postId, body.anonQuestionId, body.anonAnswerId].filter(Boolean);
    if (targets.length !== 1) {
      return NextResponse.json(
        { error: "Exactamente uno de postId / anonQuestionId / anonAnswerId es requerido" },
        { status: 400 },
      );
    }
    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json(
        { error: "reason (harmful|self_harm|harassment|spam|other) requerido" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    // Rate limit per reporter (shared across all target types).
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

    // Verify target exists + grab a snippet for the admin alert.
    let snippet = "";
    let targetKind: "post" | "question" | "answer";
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
    } else {
      const a = await prisma.anonAnswer.findUnique({
        where: { id: body.anonAnswerId! },
        select: { id: true, content: true },
      });
      if (!a) return NextResponse.json({ error: "Respuesta no encontrada" }, { status: 404 });
      snippet = a.content.slice(0, 100);
      targetKind = "answer";
    }

    const report = await prisma.communityReport.create({
      data: {
        postId: body.postId ?? null,
        anonQuestionId: body.anonQuestionId ?? null,
        anonAnswerId: body.anonAnswerId ?? null,
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

    // Count pending reports on the same target and auto-hide if threshold reached.
    const pendingFilter = body.postId
      ? { postId: body.postId, status: "pending" }
      : body.anonQuestionId
        ? { anonQuestionId: body.anonQuestionId, status: "pending" }
        : { anonAnswerId: body.anonAnswerId!, status: "pending" };

    const totalReports = await prisma.communityReport.count({ where: pendingFilter });

    if (totalReports >= AUTO_HIDE_THRESHOLD) {
      if (body.postId) {
        await prisma.communityPost.update({
          where: { id: body.postId },
          data: { hidden: true },
        });
      } else if (body.anonQuestionId) {
        await prisma.anonQuestion.update({
          where: { id: body.anonQuestionId },
          data: { hidden: true },
        });
      } else {
        await prisma.anonAnswer.update({
          where: { id: body.anonAnswerId! },
          data: { hidden: true },
        });
      }
      logInfo("COMMUNITY", "item_auto_hidden", { targetKind, totalReports });
    }

    // Immediate admin alert for self_harm.
    if (body.reason === "self_harm") {
      const targetLabel =
        targetKind === "post" ? `Post \`${body.postId}\`` :
        targetKind === "question" ? `Pregunta \`${body.anonQuestionId}\`` :
        `Respuesta \`${body.anonAnswerId}\``;
      notifyAdmin(
        `🚨 *Reporte de autolesion en comunidad*\n\n${targetLabel}\nContenido: _${snippet}_\nReportes totales: ${totalReports}`,
      );
    }

    return NextResponse.json({ ok: true, reportId: report.id, autoHidden: totalReports >= AUTO_HIDE_THRESHOLD });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/report" });
    return NextResponse.json({ error: "REPORT_FAILED" }, { status: 500 });
  }
}
