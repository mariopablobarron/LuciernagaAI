import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

/**
 * Envuelve el handler de una ruta de cron registrando start / finish / error en `CronRunLog`.
 *
 * Uso:
 *   export const GET = withCronLog("scheduled-emails", async (req) => { ... });
 *
 * El handler puede devolver `NextResponse` o un objeto. Si devuelve `{ recordsProcessed: N, metadata: {...} }`
 * se persiste. Si lanza, se marca como `failed` y re-lanza.
 */
export type CronResult = {
  response: Response;
  recordsProcessed?: number;
  metadata?: Record<string, unknown>;
};

type CronHandler = (req: Request) => Promise<Response | CronResult>;

function isCronResult(value: unknown): value is CronResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "response" in value &&
    (value as { response: unknown }).response instanceof Response
  );
}

async function createRun(jobName: string): Promise<string | null> {
  try {
    const prisma = getPrismaClient();
    const row = await prisma.cronRunLog.create({
      data: { jobName, status: "running" },
      select: { id: true },
    });
    return row.id;
  } catch {
    return null;
  }
}

async function finishRun(
  id: string,
  patch: {
    status: "success" | "failed";
    recordsProcessed?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    startedAt: number;
  },
): Promise<void> {
  try {
    const prisma = getPrismaClient();
    await prisma.cronRunLog.update({
      where: { id },
      data: {
        status: patch.status,
        finishedAt: new Date(),
        durationMs: Date.now() - patch.startedAt,
        recordsProcessed: patch.recordsProcessed,
        errorMessage: patch.errorMessage?.slice(0, 4000),
        metadata: patch.metadata
          ? (JSON.parse(JSON.stringify(patch.metadata)) as object)
          : undefined,
      },
    });
  } catch {
    // silent — no queremos que un fallo de log rompa el cron
  }
}

export function withCronLog(jobName: string, handler: CronHandler) {
  return async (req: Request): Promise<Response> => {
    const startedAt = Date.now();
    const runId = await createRun(jobName);

    try {
      const result = await handler(req);
      const response = isCronResult(result) ? result.response : result;
      const meta = isCronResult(result)
        ? { recordsProcessed: result.recordsProcessed, metadata: result.metadata }
        : {};

      if (runId) {
        await finishRun(runId, {
          status: response.status >= 200 && response.status < 300 ? "success" : "failed",
          startedAt,
          ...meta,
        });
      }
      return response;
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      logError("CRON", err, { jobName });
      if (runId) {
        await finishRun(runId, {
          status: "failed",
          errorMessage: message,
          startedAt,
        });
      }
      throw err;
    }
  };
}
