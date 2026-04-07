import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

const HTML_RESPONSE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Baja de emails</title>
  <style>
    body { margin:0; padding:40px 16px; background:#0a0a0a; color:#d4d4d8; font-family:system-ui,sans-serif; display:flex; justify-content:center; }
    .card { max-width:480px; background:#18181b; border:1px solid #27272a; border-radius:12px; padding:32px; text-align:center; }
    h1 { color:#fff; font-size:20px; margin:0 0 16px; }
    p { font-size:15px; line-height:1.6; color:#a1a1aa; margin:0 0 12px; }
    .brand { color:#818cf8; font-weight:700; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Has sido dado/a de baja</h1>
    <p>Ya no recibiras emails de <span class="brand">Tres Mil Millones de Latidos</span>.</p>
    <p>Si cambias de opinion, puedes volver a activar las notificaciones desde los ajustes de tu cuenta.</p>
  </div>
</body>
</html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Error</title>
  <style>
    body { margin:0; padding:40px 16px; background:#0a0a0a; color:#d4d4d8; font-family:system-ui,sans-serif; display:flex; justify-content:center; }
    .card { max-width:480px; background:#18181b; border:1px solid #27272a; border-radius:12px; padding:32px; text-align:center; }
    h1 { color:#fff; font-size:20px; margin:0 0 16px; }
    p { font-size:15px; line-height:1.6; color:#a1a1aa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>No se pudo procesar la baja</h1>
    <p>El email proporcionado no es valido o no esta registrado.</p>
  </div>
</body>
</html>`;

/**
 * GET /api/email/unsubscribe?email=user@example.com
 *
 * One-click email unsubscribe endpoint (GDPR / RFC 8058).
 * Disables marketing emails (weeklyEmailEnabled, reminderEnabled)
 * in UserPreferences. Transactional emails (verification, password
 * reset) are NOT affected.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return new NextResponse(ERROR_HTML, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // Return success page even if user not found to avoid leaking info
      return new NextResponse(HTML_RESPONSE, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Upsert preferences: disable marketing/reminder emails
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        weeklyEmailEnabled: false,
        reminderEnabled: false,
      },
      create: {
        userId: user.id,
        weeklyEmailEnabled: false,
        reminderEnabled: false,
      },
    });

    return new NextResponse(HTML_RESPONSE, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[UNSUBSCRIBE] Error processing unsubscribe:", err);
    return new NextResponse(ERROR_HTML, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

/**
 * POST /api/email/unsubscribe
 *
 * Supports RFC 8058 List-Unsubscribe-Post one-click unsubscribe.
 * Email clients may POST instead of GET.
 */
export async function POST(request: NextRequest) {
  // RFC 8058: the body may contain "List-Unsubscribe=One-Click"
  // but the email is in the query string
  return GET(request);
}
