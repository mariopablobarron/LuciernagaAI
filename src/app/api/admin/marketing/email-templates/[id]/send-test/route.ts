import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { buildPreview } from "@/lib/email-templates-preview";
import { EMAIL_TEMPLATE_BY_ID } from "@/lib/email-templates-catalog";
import { sendUserEmail } from "@/lib/email";
import { logInfo, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = requireAdminPermission(req, "marketing:send");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const { id } = await params;
  const meta = EMAIL_TEMPLATE_BY_ID[id];
  if (!meta) {
    return NextResponse.json({ ok: false, error: "UNKNOWN_TEMPLATE" }, { status: 404 });
  }

  let body: { to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const to = (body.to ?? "").trim();
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
  }

  const appUrl = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";
  const preview = buildPreview(id, { appUrl, to });
  if (!preview) {
    return NextResponse.json(
      {
        ok: false,
        error: "PREVIEW_UNAVAILABLE",
        message: `La plantilla "${meta.name}" no está conectada al registro de preview.`,
      },
      { status: 404 },
    );
  }

  try {
    const sent = await sendUserEmail({
      to,
      subject: `[TEST] ${preview.subject}`,
      html: preview.html,
      text: preview.text,
      template: `test-${id}`,
    });

    if (!sent) {
      return NextResponse.json(
        { ok: false, error: "SEND_FAILED", message: "Resend rechazó el envío. Mira EmailLog para el error." },
        { status: 502 },
      );
    }

    logInfo("ADMIN_MARKETING", "send_test_email", { templateId: id, to });
    return NextResponse.json({ ok: true, to, templateId: id, subject: preview.subject });
  } catch (err) {
    logError("ADMIN_MARKETING", err, { templateId: id, to });
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
