import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { generateResetToken, resetTokenExpiry } from "@/lib/reset-token";
import { sendUserEmail } from "@/lib/email";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/services/user";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = checkRateLimit(`forgot-pwd:${ip}`, 3, 60_000 * 15); // 3 requests/15min per IP
    if (!rl.allowed) {
      return NextResponse.json(
        { success: true }, // always return success to avoid enumeration
        { status: 200, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = (await req.json()) as { email?: string };
    const email = normalizeEmail(body.email?.trim() ?? "");

    if (!email) {
      return NextResponse.json({ success: false, error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    // Always return success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const { raw, hash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: resetTokenExpiry(),
      },
    });

    const appUrl = process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${raw}`;

    await sendUserEmail({
      to: email,
      userId: user.id,
      template: "password_reset",
      subject: "Recupera tu acceso",
      text: `Hola${user.name ? ` ${user.name}` : ""},\n\nRecibimos una petición para restablecer tu contraseña.\n\nHaz clic en el enlace (válido 1 hora):\n${resetUrl}\n\nSi no pediste esto, ignora este mensaje.`,
      html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #27272a">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#d946ef 100%);padding:24px 32px">
            <span style="color:#fff;font-size:18px;font-weight:700">Tres Mil Millones de Latidos</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#d4d4d8">
            <p style="margin:0 0 16px;font-size:16px;color:#fff;font-weight:600">Hola${user.name ? ` ${user.name}` : ""},</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a1a1aa">
              Recibimos una petición para restablecer la contraseña de tu cuenta.
            </p>
            <div style="text-align:center;margin:0 0 24px">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
                Restablecer contraseña
              </a>
            </div>
            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5">
              El enlace caduca en 1 hora. Si no pediste esto, ignora este correo.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272a">
            <p style="margin:0;font-size:11px;color:#52525b;text-align:center">
              Tres Mil Millones de Latidos — no sustituye ayuda profesional.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/forgot-password" });
    return NextResponse.json({ success: false, error: "FORGOT_FAILED" }, { status: 500 });
  }
}
