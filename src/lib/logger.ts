import { getErrorMessage } from "@/lib/utils";
import { sanitizeMeta } from "@/lib/log-sanitize";

// In production suppress info-level console logs; warn and error always go through.
const IS_PROD = process.env.NODE_ENV === "production";

// ── SystemLog DB writer (async buffer) ────────────────────────────────────────
// Persists logs to Postgres via Prisma. Runs node-only. Flushes in batches to
// avoid per-request latency. Failures fall back to stderr — never throw.
type BufferedEntry = {
  timestamp: Date;
  level: "info" | "warn" | "error";
  tag: string;
  message: string;
  context: Record<string, unknown> | null;
  stack?: string;
  // Columnas dedicadas en SystemLog (Prisma schema) que hasta ahora se
  // quedaban siempre NULL. Sin esto no se puede medir latencia por route
  // ni filtrar logs por userId con índice. Auditoría 2026-05-24: route y
  // durationMs vacíos en 30 días de producción.
  userId?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
};

/**
 * Extrae los campos especiales (__route, __userId, etc.) del meta y los
 * devuelve separados del context restante. Mantiene la API pública de
 * logInfo/logWarn/logError intacta — solo se popula la columna si el
 * caller pasa el campo con prefijo `__`.
 */
function extractStructured(
  meta?: Record<string, unknown>,
): {
  context: Record<string, unknown> | null;
  userId?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
} {
  if (!meta) return { context: null };
  const out: Record<string, unknown> = {};
  let userId: string | undefined;
  let route: string | undefined;
  let statusCode: number | undefined;
  let durationMs: number | undefined;

  for (const [k, v] of Object.entries(meta)) {
    if (k === "__userId" && typeof v === "string" && v.length <= 200) {
      userId = v;
    } else if (k === "__route" && typeof v === "string" && v.length <= 200) {
      route = v;
    } else if (k === "__statusCode" && typeof v === "number" && Number.isFinite(v)) {
      statusCode = Math.trunc(v);
    } else if (k === "__durationMs" && typeof v === "number" && Number.isFinite(v) && v >= 0) {
      durationMs = Math.trunc(v);
    } else {
      out[k] = v;
    }
  }

  return {
    context: Object.keys(out).length === 0 ? null : out,
    userId,
    route,
    statusCode,
    durationMs,
  };
}

const MAX_BUFFER = 50;
const FLUSH_INTERVAL_MS = 5000;
const logBuffer: BufferedEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let dbDisabled = false;

function isDbSinkEnabled(): boolean {
  if (dbDisabled) return false;
  if (typeof window !== "undefined") return false;
  if (process.env.NEXT_RUNTIME === "edge") return false;
  if (process.env.SYSTEM_LOG_DB === "0") return false;
  return true;
}

async function flushBuffer(): Promise<void> {
  if (flushing || logBuffer.length === 0) return;
  flushing = true;
  const batch = logBuffer.splice(0);
  try {
    if (!isDbSinkEnabled()) return;
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    await prisma.systemLog.createMany({
      data: batch.map((b) => ({
        timestamp: b.timestamp,
        level: b.level,
        tag: b.tag,
        message: b.message.slice(0, 8000),
        context: (b.context === null
          ? undefined
          : JSON.parse(JSON.stringify(b.context))) as object | undefined,
        stack: b.stack?.slice(0, 4000),
        userId: b.userId,
        route: b.route?.slice(0, 200),
        statusCode: b.statusCode,
        durationMs: b.durationMs,
      })),
    });
  } catch (err) {
    // Avoid re-entering the logger on failure — use stderr directly
    process.stderr.write(
      `[logger] flush of ${batch.length} logs failed: ${(err as Error).message}\n`,
    );
    // If we keep failing, disable the DB sink after a threshold
    dbDisabled = true;
    setTimeout(() => {
      dbDisabled = false;
    }, 60_000);
  } finally {
    flushing = false;
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushBuffer();
  }, FLUSH_INTERVAL_MS);
}

function enqueueLog(entry: BufferedEntry): void {
  if (!isDbSinkEnabled()) return;
  logBuffer.push(entry);
  if (logBuffer.length >= MAX_BUFFER) {
    void flushBuffer();
  } else {
    scheduleFlush();
  }
}

// Best-effort flush on process exit
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("beforeExit", () => {
    void flushBuffer();
  });
}

// ── Better Stack (Logtail) ────────────────────────────────────────────────────
// Lazy-initialized singleton — safe in edge + node runtimes.
let _logtail: { info: F; warn: F; error: F; flush: () => Promise<void> } | null = null;

type F = (msg: string, ctx?: Record<string, unknown>) => Promise<unknown>;

function getLogtail(): { info: F; warn: F; error: F; flush: () => Promise<void> } | null {
  if (_logtail) return _logtail;
  const token = process.env.LOGTAIL_SOURCE_TOKEN;
  if (!token) return null;
  try {
    // Dynamic require so the module is not bundled for the browser
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Logtail } = require("@logtail/node") as {
      Logtail: new (token: string) => { info: F; warn: F; error: F; flush: () => Promise<void> };
    };
    _logtail = new Logtail(token);
    return _logtail;
  } catch {
    return null;
  }
}

// ── Sentry ────────────────────────────────────────────────────────────────────
async function captureToSentry(error: unknown, meta?: Record<string, unknown>) {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      if (meta) scope.setExtras(meta as Record<string, unknown>);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  } catch {
    // Sentry not available during build — silently ignore
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ts(): string {
  return new Date().toISOString();
}

// ── Public API ────────────────────────────────────────────────────────────────
export function logInfo(tag: string, message: string, meta?: Record<string, unknown>): void {
  const safeMeta = sanitizeMeta(meta);
  const structured = extractStructured(safeMeta);
  const ctx = { tag, ...(structured.context ?? {}) };
  if (!IS_PROD) console.info(`[${ts()}] [INFO] [${tag}] ${message}`, structured.context ?? "");
  void getLogtail()?.info(message, ctx);
  enqueueLog({
    timestamp: new Date(),
    level: "info",
    tag,
    message,
    context: structured.context,
    userId: structured.userId,
    route: structured.route,
    statusCode: structured.statusCode,
    durationMs: structured.durationMs,
  });
}

async function fireAlerts(entry: { level: "warn" | "error"; tag: string; message: string; stack?: string }): Promise<void> {
  if (!isDbSinkEnabled()) return;
  try {
    const { evaluateLogForAlerts } = await import("@/lib/alerts-fire");
    await evaluateLogForAlerts(entry);
  } catch {
    // silent — alerting must not break logging
  }
}

export function logWarn(tag: string, message: string, meta?: Record<string, unknown>): void {
  const safeMeta = sanitizeMeta(meta);
  const structured = extractStructured(safeMeta);
  const ctx = { tag, ...(structured.context ?? {}) };
  console.warn(`[${ts()}] [WARN] [${tag}] ${message}`, structured.context ?? "");
  void getLogtail()?.warn(message, ctx);
  enqueueLog({
    timestamp: new Date(),
    level: "warn",
    tag,
    message,
    context: structured.context,
    userId: structured.userId,
    route: structured.route,
    statusCode: structured.statusCode,
    durationMs: structured.durationMs,
  });
  void fireAlerts({ level: "warn", tag, message });
}

export function logError(tag: string, error: unknown, meta?: Record<string, unknown>): void {
  const base = getErrorMessage(error);
  const safeMeta = sanitizeMeta(meta);
  const structured = extractStructured(safeMeta);
  const ctx = { tag, error: base, ...(structured.context ?? {}) };
  console.error(`[${ts()}] [ERROR] [${tag}] ${base}`, structured.context ?? "");
  void getLogtail()?.error(base, ctx);
  void captureToSentry(error, { tag, ...(structured.context ?? {}) });
  const stack = error instanceof Error ? error.stack : undefined;
  enqueueLog({
    timestamp: new Date(),
    level: "error",
    tag,
    message: base,
    context: structured.context,
    stack,
    userId: structured.userId,
    route: structured.route,
    statusCode: structured.statusCode,
    durationMs: structured.durationMs,
  });
  void fireAlerts({ level: "error", tag, message: base, stack });
}

// ── Namespaced helpers ────────────────────────────────────────────────────────
export const logChat = {
  info: (message: string, meta?: Record<string, unknown>) => logInfo("CHAT", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logWarn("CHAT", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    logError("CHAT", new Error(message), meta),
};

export const logDb = {
  info: (message: string, meta?: Record<string, unknown>) => logInfo("DB", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logWarn("DB", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    logError("DB", new Error(message), meta),
};
