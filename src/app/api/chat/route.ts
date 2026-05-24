import { NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { orchestrateChat, buildErrorResponse } from "@/services/chatOrchestrator";

const ROUTE = "/api/chat";

export async function POST(req: NextRequest) {
  // Medición de latencia del endpoint crítico — hasta ahora 0 datos
  // en SystemLog porque ni route ni durationMs se populaban. Auditoría
  // 2026-05-24 reveló 50% de abandono al 1er msg sin saber si era por
  // lentitud. Esta instrumentación es el primer paso.
  const startedAt = Date.now();

  try {
    const response = await orchestrateChat(req);
    // Solo loguea el ÉXITO si no es streaming SSE (que dura todo el
    // tiempo que el cliente está conectado y distorsionaría la métrica).
    // Para SSE, el header Content-Type es text/event-stream.
    const isStream = response.headers.get("content-type")?.includes("text/event-stream");
    logInfo("CHAT", isStream ? "request_streaming" : "request_done", {
      __route: ROUTE,
      __durationMs: Date.now() - startedAt,
      __statusCode: response.status,
      method: "POST",
      isStream: !!isStream,
    });
    return response;
  } catch (error: unknown) {
    // Manejo exclusivo de errores catastróficos no controlados por el orquestador
    logError("CHAT", error, {
      __route: ROUTE,
      __durationMs: Date.now() - startedAt,
      __statusCode: 500,
      method: "POST",
    });
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
