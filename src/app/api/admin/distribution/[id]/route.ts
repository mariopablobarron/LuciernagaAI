import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/distribution/[id]
 *
 * Acciones para un DiscoveryMatch:
 *   action=approve  → status: approved + guarda draft editado opcional
 *   action=reject   → status: rejected
 *   action=publish  → marca como publicado con publishedUrl (Mario lo posteó manualmente)
 *   action=edit     → solo actualiza draftResponse (sin cambio de status)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      draftResponse?: string;
      publishedUrl?: string;
    };

    const prisma = getPrismaClient();
    const existing = await prisma.discoveryMatch.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};

    switch (body.action) {
      case "approve":
        data.status = "approved";
        data.approvedAt = new Date();
        if (typeof body.draftResponse === "string") data.draftResponse = body.draftResponse.slice(0, 2000);
        break;
      case "reject":
        data.status = "rejected";
        data.rejectedAt = new Date();
        break;
      case "publish":
        if (typeof body.publishedUrl !== "string" || !body.publishedUrl.trim()) {
          return NextResponse.json({ error: "publishedUrl requerido" }, { status: 400 });
        }
        data.status = "published";
        data.publishedAt = new Date();
        data.publishedUrl = body.publishedUrl.trim();
        break;
      case "edit":
        if (typeof body.draftResponse !== "string") {
          return NextResponse.json({ error: "draftResponse requerido" }, { status: 400 });
        }
        data.draftResponse = body.draftResponse.slice(0, 2000);
        break;
      default:
        return NextResponse.json({ error: "action inválida" }, { status: 400 });
    }

    const updated = await prisma.discoveryMatch.update({ where: { id }, data });
    return NextResponse.json({ match: updated });
  } catch (error) {
    logError("DISCOVERY", error, { action: "patch" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
