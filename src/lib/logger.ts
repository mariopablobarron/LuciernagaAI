import { getErrorMessage } from "@/lib/utils";

// In production suppress info-level console logs; warn and error always go through.
const IS_PROD = process.env.NODE_ENV === "production";

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
  const ctx = { tag, ...meta };
  if (!IS_PROD) console.info(`[${ts()}] [INFO] [${tag}] ${message}`, meta ?? "");
  void getLogtail()?.info(message, ctx);
}

export function logWarn(tag: string, message: string, meta?: Record<string, unknown>): void {
  const ctx = { tag, ...meta };
  console.warn(`[${ts()}] [WARN] [${tag}] ${message}`, meta ?? "");
  void getLogtail()?.warn(message, ctx);
}

export function logError(tag: string, error: unknown, meta?: Record<string, unknown>): void {
  const base = getErrorMessage(error);
  const ctx = { tag, error: base, ...meta };
  console.error(`[${ts()}] [ERROR] [${tag}] ${base}`, meta ?? "");
  void getLogtail()?.error(base, ctx);
  void captureToSentry(error, { tag, ...meta });
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
