import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { postRedditComment } from "@/services/discovery/reddit-oauth";

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
      case "auto-publish": {
        // Publica el draftResponse directamente en Reddit con la cuenta OAuth conectada.
        if (existing.platform !== "reddit") {
          return NextResponse.json({ error: "auto-publish solo soportado en Reddit por ahora" }, { status: 400 });
        }
        if (!existing.draftResponse?.trim()) {
          return NextResponse.json({ error: "Sin borrador para publicar" }, { status: 400 });
        }
        const result = await postRedditComment({
          parentFullname: existing.externalId,
          text: existing.draftResponse,
        });
        if (!result.ok) {
          await prisma.discoveryMatch.update({
            where: { id },
            data: { status: "failed", publishError: result.error.slice(0, 500) },
          });
          return NextResponse.json({ error: result.error }, { status: 502 });
        }
        data.status = "published";
        data.publishedAt = new Date();
        data.publishedUrl = result.url;
        data.publishError = null;
        if (!existing.approvedAt) data.approvedAt = new Date();
        break;
      }
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
