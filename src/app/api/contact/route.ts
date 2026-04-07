import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_BODY_SIZE = 10 * 1024; // 10 KB

export const POST = withRateLimit(async function POST(request: NextRequest) {
  try {
    const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = await request.json();
    const { name, email, message } = body as { name?: string; email?: string; message?: string };

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    logInfo("CONTACT", "nuevo_mensaje", { name, email });

    // Forward to admin via Telegram (fire-and-forget)
    notifyAdmin(
      `📬 *Nuevo mensaje de contacto*\n\n` +
      `*Nombre:* ${name}\n` +
      `*Email:* \`${email}\`\n\n` +
      `*Mensaje:*\n${message.slice(0, 800)}${message.length > 800 ? "…" : ""}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("CONTACT", error, { route: "/api/contact" });
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}, { limit: 10 });
