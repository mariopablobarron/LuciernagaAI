import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { adminJson } from "@/lib/admin-response";
import { buildPreview } from "@/lib/email-templates-preview";
import { EMAIL_TEMPLATE_BY_ID } from "@/lib/email-templates-catalog";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = requireAdminPermission(req, "marketing:metrics");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const { id } = await params;
  const meta = EMAIL_TEMPLATE_BY_ID[id];

  const appUrl = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";
  const preview = buildPreview(id, { appUrl, to: "preview@example.com" });

  if (!preview) {
    return adminJson(
      {
        ok: false,
        error: "PREVIEW_UNAVAILABLE",
        message: meta
          ? `La plantilla "${meta.name}" no está conectada al registro de preview. Puede que viva inline en su endpoint o servicio.`
          : `Plantilla "${id}" desconocida.`,
      },
      { status: 404 },
    );
  }

  return adminJson({
    ok: true,
    template: meta ? { id: meta.id, name: meta.name, description: meta.description } : { id, name: id, description: "" },
    subject: preview.subject,
    html: preview.html,
    text: preview.text,
    note: "Datos mock. El render real puede variar según los datos del usuario.",
  });
}
