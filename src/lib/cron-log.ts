import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

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

async function createRun(
  jobName: string,
  dedupKey: string | null = null,
): Promise<string | null> {
  try {
    const prisma = getPrismaClient();
    const row = await prisma.cronRunLog.create({
      data: { jobName, status: "running", dedupKey },
      select: { id: true },
    });
    return row.id;
  } catch {
    return null;
  }
}

class CronDedupSkipped extends Error {
  constructor(public readonly jobName: string, public readonly dedupKey: string) {
    super(`Cron ${jobName} already ran for dedup key ${dedupKey}`);
    this.name = "CronDedupSkipped";
  }
}

async function createDedupedRun(
  jobName: string,
  dedupKey: string,
): Promise<string> {
  try {
    const prisma = getPrismaClient();
    const row = await prisma.cronRunLog.create({
      data: { jobName, status: "running", dedupKey },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw new CronDedupSkipped(jobName, dedupKey);
    }
    throw err;
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

/**
 * Distributed lock for crons that must not run twice for the same logical
 * window (week, day, etc.). Uses a UNIQUE(jobName, dedupKey) constraint on
 * CronRunLog as the lock primitive — the first caller wins, the rest get a
 * 200 with `skipped: "dedup_lock"`.
 *
 * Recovery from a failed run: the row remains with status="failed" and the
 * dedup key still locked. To allow a retry, delete that CronRunLog row by id.
 */
export type DedupKeyFn = (req: Request) => string;

export function withCronDedup(
  jobName: string,
  dedupKeyFn: DedupKeyFn,
  handler: CronHandler,
) {
  return async (req: Request): Promise<Response> => {
    const startedAt = Date.now();
    const dedupKey = dedupKeyFn(req);

    let runId: string;
    try {
      runId = await createDedupedRun(jobName, dedupKey);
    } catch (err) {
      if (err instanceof CronDedupSkipped) {
        logInfo("CRON", "skipped_by_dedup", { jobName, dedupKey });
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "dedup_lock", dedupKey }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      // Unexpected DB error — fall back to running without lock so the cron
      // job is not silently dropped. Log loudly.
      logError("CRON", err, { jobName, dedupKey, step: "create_dedup_lock" });
      const fallback = await withCronLog(jobName, handler)(req);
      return fallback;
    }

    try {
      const result = await handler(req);
      const response = isCronResult(result) ? result.response : result;
      const meta = isCronResult(result)
        ? { recordsProcessed: result.recordsProcessed, metadata: result.metadata }
        : {};
      await finishRun(runId, {
        status: response.status >= 200 && response.status < 300 ? "success" : "failed",
        startedAt,
        ...meta,
      });
      return response;
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      logError("CRON", err, { jobName, dedupKey });
      await finishRun(runId, {
        status: "failed",
        errorMessage: message,
        startedAt,
      });
      throw err;
    }
  };
}

/** UTC day key in YYYY-MM-DD form. Idempotency window: 24h. */
export function dailyUtcKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** ISO 8601 week key in YYYY-Www form. Idempotency window: 7 days, Mon→Sun. */
export function isoWeekKey(now: Date = new Date()): string {
  const d = new Date(now.getTime());
  d.setUTCHours(0, 0, 0, 0);
  // Thursday of the current ISO week
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
