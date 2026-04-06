import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { orchestrateChat, buildErrorResponse } from "@/services/chatOrchestrator";

export async function POST(req: NextRequest) {
  try {
    // Delegar toda la complejidad al Orquestador
    return await orchestrateChat(req);
  } catch (error: unknown) {
    // Manejo exclusivo de errores catastróficos no controlados por el orquestador
    logError("CHAT", error, { route: "chat" });
    const rawMessage = getErrorMessage(error);
    const clearMessage =
      rawMessage === "MISSING_OPENROUTER_API_KEY"
        ? "Error de configuración del servidor"
        : rawMessage.toLowerCase().includes("openrouter")
          ? "Fallo en proveedor de IA"
          : "Error interno del servidor";

    return buildErrorResponse(clearMessage, 500, "neutral", "INTERNAL_ERROR");
  }
}
