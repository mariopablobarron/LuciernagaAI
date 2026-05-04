import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { isValidCronSecret } from "@/lib/cron-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/seo-opportunities[?status=open&kind=ranking_4_20&format=csv]
 *
 * Lista oportunidades SEO detectadas. Auth: sesión admin O ?secret=CRON_SECRET.
 *
 * Query params:
 *   - status: open (default) | in_progress | done | dismissed | all
 *   - kind:   filtra por tipo de oportunidad
 *   - format: json (default) | csv
 *   - limit:  default 200
 *
 * PATCH /api/admin/seo-opportunities (body: { id, status })
 *   Cambia el status de una oportunidad. Solo admin auth.
 */
export async function GET(req: NextRequest) {
  const hasCronSecret = isValidCronSecret(req.nextUrl.searchParams.get("secret"));
  if (!hasCronSecret) {
    const auth = requireAdminPermission(req, "analytics");
    if (auth instanceof NextResponse) return auth;
  }

  const status = req.nextUrl.searchParams.get("status") ?? "open";
  const kind = req.nextUrl.searchParams.get("kind");
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "200"), 1000);

  try {
    const prisma = getPrismaClient();
    const where = {
      ...(status !== "all" ? { status } : {}),
      ...(kind ? { kind } : {}),
    };
    const opportunities = await prisma.seoOpportunity.findMany({
      where,
      orderBy: [{ priority: "desc" }, { detectedAt: "desc" }],
      take: limit,
    });

    if (format === "csv") {
      const header = "id,kind,priority,status,url,query,recommendation,detectedAt";
      const rows = opportunities.map((o) =>
        [
          o.id,
          o.kind,
          o.priority,
          o.status,
          (o.url ?? "").replace(/,/g, ";"),
          (o.query ?? "").replace(/,/g, ";"),
          o.recommendation.replace(/[\r\n,]/g, " ").slice(0, 300),
          o.detectedAt.toISOString(),
        ].join(","),
      );
      return new NextResponse([header, ...rows].join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="seo-opportunities-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      count: opportunities.length,
      opportunities,
    });
  } catch (error) {
    logError("SEO_OPP", error, { route: "/api/admin/seo-opportunities" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  let body: { id?: unknown; status?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  const status = typeof body.status === "string" ? body.status : null;
  if (!id || !status) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const validStatuses = new Set(["open", "in_progress", "done", "dismissed"]);
  if (!validStatuses.has(status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();
    const updated = await prisma.seoOpportunity.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "done" || status === "dismissed" ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, opportunity: updated });
  } catch (error) {
    logError("SEO_OPP", error, { stage: "patch_status", id });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
