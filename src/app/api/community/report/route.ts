import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logInfo, logError } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";

export const dynamic = "force-dynamic";

const VALID_REASONS = ["harmful", "self_harm", "harassment", "spam", "other"];

/**
 * POST /api/community/report — report a community post
 * Body: { postId: string, reason: string, details?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      postId?: string;
      reason?: string;
      details?: string;
    };

    if (!body.postId || !body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json(
        { error: "postId y reason (harmful|self_harm|harassment|spam|other) requeridos" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    // Verify post exists
    const post = await prisma.communityPost.findUnique({
      where: { id: body.postId },
      select: { id: true, content: true, feeling: true, type: true, userId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    }

    // Rate limit: max 5 reports per user per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const reportsToday = await prisma.communityReport.count({
      where: { reporterId: identity.userId, createdAt: { gte: todayStart } },
    });
    if (reportsToday >= 5) {
      return NextResponse.json({ error: "Maximo 5 reportes por dia" }, { status: 429 });
    }

    // Create report
    const report = await prisma.communityReport.create({
      data: {
        postId: body.postId,
        reporterId: identity.userId,
        reason: body.reason,
        details: body.details?.trim().slice(0, 500) || null,
        status: "pending",
      },
    });

    logInfo("COMMUNITY", "post_reported", {
      reportId: report.id,
      postId: body.postId,
      reason: body.reason,
      reporterId: identity.userId,
    });

    // Auto-hide post if it gets 3+ reports
    const totalReports = await prisma.communityReport.count({
      where: { postId: body.postId, status: "pending" },
    });
    if (totalReports >= 3) {
      await prisma.communityPost.update({
        where: { id: body.postId },
        data: { hidden: true },
      });
      logInfo("COMMUNITY", "post_auto_hidden", { postId: body.postId, totalReports });
    }

    // Notify admin for self_harm reports immediately
    if (body.reason === "self_harm") {
      const snippet = (post.content ?? post.feeling ?? "").slice(0, 100);
      notifyAdmin(
        `🚨 *Reporte de autolesion en comunidad*\n\nPost: \`${body.postId}\`\nContenido: _${snippet}_\nReportes totales: ${totalReports}`,
      );
    }

    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/report" });
    return NextResponse.json({ error: "REPORT_FAILED" }, { status: 500 });
  }
}
