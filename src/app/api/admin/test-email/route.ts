import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { sendUserEmail } from "@/lib/email";
import { isValidCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/test-email?secret=CRON_SECRET&to=email@example.com
export async function GET(req: NextRequest) {
  // Require admin auth OR CRON_SECRET
  const hasCronSecret = isValidCronSecret(req.nextUrl.searchParams.get("secret"));
  if (!hasCronSecret) {
    const auth = requireAdminPermission(req, "settings");
    if (auth instanceof NextResponse) return auth;
  }

  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Missing ?to=email" }, { status: 400 });
  }

  const ok = await sendUserEmail({
    to,
    subject: "Test — Tres Mil Millones de Latidos",
    text: "Si ves este email, el sistema de correo funciona correctamente.",
    html: `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:system-ui,sans-serif;color:#d4d4d8">
  <div style="max-width:500px;margin:0 auto;background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden">
    <div style="background:linear-gradient(135deg,#7c3aed,#d946ef);padding:24px 32px">
      <span style="color:#fff;font-size:18px;font-weight:700">Tres Mil Millones de Latidos</span>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;color:#fff;font-size:16px">El sistema de email funciona correctamente.</p>
      <p style="margin:0;color:#71717a;font-size:13px">Este es un email de prueba enviado desde la API.</p>
    </div>
  </div>
</body>
</html>`,
  });

  return NextResponse.json({
    ok,
    to,
    apiKeyConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    from: process.env.EMAIL_FROM?.trim() ?? "TresMilMillonesdeLatidos <info@tresmilmillonesdelatidos.es>",
  });
}
