import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logInfo } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/insights/history
 * Lista los snapshots archivados (para el panel de investigación).
 */
export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = resolveAdminAuth(req);
  if (!adminAuth.authenticated) {
    const unauthorized = NextResponse.json(
      { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
      { status: 401 }
    );
    if (adminAuth.source === "invalid") {
      clearAdminSessionCookie(unauthorized);
    }
    return unauthorized;
  }

  const prisma = getPrismaClient();
  const snapshots = await prisma.adminSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      label: true,
      summary: true,
      recordCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ snapshots });
}, { limit: 30 });

/**
 * DELETE /api/admin/insights/history
 * Archiva el historial actual en un snapshot y luego limpia.
 * Query params: ?target=decisions|insights|all (default: all)
 */
export const DELETE = withRateLimit(async function DELETE(req: NextRequest) {
  const adminAuth = resolveAdminAuth(req);
  if (!adminAuth.authenticated) {
    const unauthorized = NextResponse.json(
      { error: "UNAUTHORIZED_ADMIN", message: "Admin authentication required." },
      { status: 401 }
    );
    if (adminAuth.source === "invalid") {
      clearAdminSessionCookie(unauthorized);
    }
    return unauthorized;
  }

  const target = req.nextUrl.searchParams.get("target") ?? "all";
  const prisma = getPrismaClient();

  // Step 1: Collect data to archive
  const archiveData: Record<string, unknown> = { archivedAt: new Date().toISOString(), target };
  let totalRecords = 0;

  if (target === "all" || target === "decisions") {
    const decisions = await prisma.decisionLog.findMany({
      orderBy: { createdAt: "desc" },
    });
    archiveData.decisions = decisions;
    totalRecords += decisions.length;
  }

  if (target === "all" || target === "insights") {
    const insights = await prisma.insight.findMany({
      orderBy: { createdAt: "desc" },
    });
    archiveData.insights = insights;
    totalRecords += insights.length;
  }

  // Step 2: Create snapshot (only if there's data to archive)
  let snapshotId: string | null = null;
  if (totalRecords > 0) {
    const now = new Date();
    const label = `Reset ${target} — ${now.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    const parts: string[] = [];
    if (archiveData.decisions) {
      parts.push(`${(archiveData.decisions as unknown[]).length} decisiones`);
    }
    if (archiveData.insights) {
      parts.push(`${(archiveData.insights as unknown[]).length} insights`);
    }

    const snapshot = await prisma.adminSnapshot.create({
      data: {
        type: "reset",
        label,
        data: archiveData as Record<string, unknown> as Parameters<typeof prisma.adminSnapshot.create>[0]["data"]["data"],
        summary: `Archivado: ${parts.join(", ")}`,
        recordCount: totalRecords,
      },
    });
    snapshotId = snapshot.id;
  }

  // Step 3: Delete the records
  let deletedDecisions = 0;
  let deletedInsights = 0;

  if (target === "all" || target === "decisions") {
    const result = await prisma.decisionLog.deleteMany({});
    deletedDecisions = result.count;
  }

  if (target === "all" || target === "insights") {
    const result = await prisma.insight.deleteMany({});
    deletedInsights = result.count;
  }

  logInfo("ADMIN", "history_reset_with_archive", {
    target,
    snapshotId,
    deletedDecisions,
    deletedInsights,
    totalArchived: totalRecords,
  });

  return NextResponse.json({
    success: true,
    archived: { snapshotId, recordCount: totalRecords },
    deleted: { decisions: deletedDecisions, insights: deletedInsights },
  });
}, { limit: 30 });
