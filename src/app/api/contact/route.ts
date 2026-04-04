import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validación básica
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Validar email con regex simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // TODO: Aquí iría la lógica de envío real
    // Por ahora solo guardamos el mensaje en logs
    logInfo("CONTACT", "nuevo_mensaje", { name, email, timestamp: new Date().toISOString() });

    // Opcionalmente: Enviar email usando un servicio como SendGrid, Resend, etc.
    // await sendEmailNotification(email, name, message);

    return NextResponse.json(
      { success: true, message: "Mensaje recibido correctamente" },
      { status: 200 }
    );
  } catch (error) {
    logError("CONTACT", error, { route: "/api/contact" });
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
