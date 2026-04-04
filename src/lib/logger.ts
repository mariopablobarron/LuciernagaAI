import { getErrorMessage } from "@/lib/utils";

// In production suppress info-level logs; warn and error always go through.
const IS_PROD = process.env.NODE_ENV === "production";

function ts(): string {
  return new Date().toISOString();
}

// Lazy Sentry import — safe to call server-side and client-side.
// We import lazily to avoid issues during build when SENTRY_DSN may not be set.
async function captureToSentry(error: unknown, meta?: Record<string, unknown>) {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      if (meta) scope.setExtras(meta as Record<string, unknown>);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  } catch {
    // Sentry not available (e.g. during build) — silently ignore
  }
}

export function logInfo(tag: string, message: string, meta?: Record<string, unknown>): void {
  if (IS_PROD) return;
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.info(`[${ts()}] [INFO] [${tag}] ${message}${suffix}`);
}

export function logWarn(tag: string, message: string, meta?: Record<string, unknown>): void {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.warn(`[${ts()}] [WARN] [${tag}] ${message}${suffix}`);
}

export function logError(tag: string, error: unknown, meta?: Record<string, unknown>): void {
  const base = getErrorMessage(error);
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.error(`[${ts()}] [ERROR] [${tag}] ${base}${suffix}`);
  // Forward all errors to Sentry (fire-and-forget)
  void captureToSentry(error, { tag, ...meta });
}

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
