import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { generateResetToken, resetTokenExpiry } from "@/lib/reset-token";
import { sendUserEmail } from "@/lib/email";
import { logError } from "@/lib/logger";
import { normalizeEmail } from "@/services/user";

export async function POST(req: NextRequest) {
  try {
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
      subject: "Recupera tu contraseña de Tres Mil Millones de Latidos",
      text: `Hola${user.name ? ` ${user.name}` : ""},\n\nPide restablecer tu contraseña. Haz clic en el enlace (válido 1 hora):\n\n${resetUrl}\n\nSi no pediste esto, ignora este mensaje.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#7c3aed">Recupera tu contraseña</h2>
          <p>Hola${user.name ? ` <strong>${user.name}</strong>` : ""},</p>
          <p>Recibimos una petición para restablecer la contraseña de tu cuenta.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
              Restablecer contraseña
            </a>
          </p>
          <p style="color:#71717a;font-size:13px">El enlace caduca en 1 hora. Si no pediste esto, ignora este correo.</p>
        </div>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("AUTH", err, { route: "/api/auth/forgot-password" });
    return NextResponse.json({ success: false, error: "FORGOT_FAILED" }, { status: 500 });
  }
}
