import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

/**
 * Envuelve el handler de una ruta de webhook registrando en `WebhookLog`.
 *
 * Uso:
 *   export const POST = withWebhookLog("stripe", async (req) => { ... });
 *
 * Opciones:
 *   - capturePayload: guardar el body JSON (por defecto true). Útil desactivar en payloads enormes.
 *   - extractEvent: función que recibe el body JSON parseado y devuelve el nombre del evento.
 */
type WebhookHandlerContext = {
  logWebhook: (patch: {
    event?: string;
    signatureValid?: boolean;
    metadata?: Record<string, unknown>;
  }) => void;
};

type WebhookHandler = (
  req: Request,
  ctx: WebhookHandlerContext,
) => Promise<Response>;

type WebhookOptions = {
  capturePayload?: boolean;
  maxPayloadBytes?: number;
};

async function createEntry(source: string): Promise<string | null> {
  try {
    const prisma = getPrismaClient();
    const row = await prisma.webhookLog.create({
      data: { source, status: "received" },
      select: { id: true },
    });
    return row.id;
  } catch {
    return null;
  }
}

async function finishEntry(
  id: string,
  patch: {
    status: "processed" | "failed";
    statusCode: number;
    event?: string;
    signatureValid?: boolean;
    errorMessage?: string;
    payload?: unknown;
    startedAt: number;
  },
): Promise<void> {
  try {
    const prisma = getPrismaClient();
    await prisma.webhookLog.update({
      where: { id },
      data: {
        status: patch.status,
        statusCode: patch.statusCode,
        event: patch.event,
        signatureValid: patch.signatureValid,
        errorMessage: patch.errorMessage?.slice(0, 4000),
        durationMs: Date.now() - patch.startedAt,
        processedAt: new Date(),
        payload: patch.payload
          ? (JSON.parse(JSON.stringify(patch.payload)) as object)
          : undefined,
      },
    });
  } catch {
    // silent
  }
}

export function withWebhookLog(
  source: string,
  handler: WebhookHandler,
  options: WebhookOptions = {},
) {
  const { capturePayload = true, maxPayloadBytes = 64_000 } = options;

  return async (req: Request): Promise<Response> => {
    const startedAt = Date.now();
    const entryId = await createEntry(source);

    // Capture body for logging (non-blocking on parse failure)
    let payload: unknown = null;
    if (capturePayload) {
      try {
        const cloned = req.clone();
        const text = await cloned.text();
        if (text.length <= maxPayloadBytes) {
          try {
            payload = JSON.parse(text);
          } catch {
            payload = { _raw: text.slice(0, maxPayloadBytes) };
          }
        } else {
          payload = { _truncated: true, bytes: text.length };
        }
      } catch {
        // ignore
      }
    }

    let captured: { event?: string; signatureValid?: boolean } = {};
    const ctx: WebhookHandlerContext = {
      logWebhook: (patch) => {
        captured = { ...captured, ...patch };
      },
    };

    try {
      const response = await handler(req, ctx);
      if (entryId) {
        await finishEntry(entryId, {
          status: response.status >= 200 && response.status < 300 ? "processed" : "failed",
          statusCode: response.status,
          event: captured.event,
          signatureValid: captured.signatureValid,
          payload,
          startedAt,
        });
      }
      return response;
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      logError("WEBHOOK", err, { source });
      if (entryId) {
        await finishEntry(entryId, {
          status: "failed",
          statusCode: 500,
          event: captured.event,
          signatureValid: captured.signatureValid,
          errorMessage: message,
          payload,
          startedAt,
        });
      }
      throw err;
    }
  };
}
