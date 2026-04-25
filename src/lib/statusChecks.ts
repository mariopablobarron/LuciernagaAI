import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export type CheckResult = {
  id: string;
  name: string;
  category: "infra" | "integrations" | "crons" | "product" | "security";
  status: CheckStatus;
  latencyMs: number;
  detail: string;
  meta?: Record<string, string | number | boolean | null>;
};

type Check = {
  id: string;
  name: string;
  category: CheckResult["category"];
  run: () => Promise<Omit<CheckResult, "id" | "name" | "category" | "latencyMs">>;
};

const DEFAULT_TIMEOUT_MS = 4000;

async function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

async function pingHttp(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await withTimeout(fetch(url, { ...init, cache: "no-store" }));
    return { ok: res.ok, status: res.status };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, status: 0, error: msg };
  }
}

function envPresent(keys: string[]): { missing: string[]; present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) present.push(key);
    else missing.push(key);
  }
  return { missing, present };
}

// ─── Checks ──────────────────────────────────────────────────────────────────

const CHECKS: Check[] = [
  // ─── Infra ─────────────────────────────────────────────────────────────────
  {
    id: "db.connection",
    name: "Postgres (SELECT 1)",
    category: "infra",
    run: async () => {
      const prisma = getPrismaClient();
      await withTimeout(prisma.$queryRaw`SELECT 1`);
      return { status: "ok", detail: "Conexión Prisma activa" };
    },
  },
  {
    id: "db.migrations",
    name: "Migraciones Prisma",
    category: "infra",
    run: async () => {
      const prisma = getPrismaClient();
      const rows = await withTimeout(
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NULL`,
        ),
      );
      const pending = Number(rows[0]?.count ?? 0);
      if (pending > 0) {
        return {
          status: "fail",
          detail: `${pending} migraciones pendientes`,
          meta: { pending },
        };
      }
      return { status: "ok", detail: "Todas aplicadas" };
    },
  },

  // ─── Integraciones externas ────────────────────────────────────────────────
  {
    id: "integration.resend",
    name: "Resend (email)",
    category: "integrations",
    run: async (): Promise<Omit<CheckResult, "id" | "name" | "category" | "latencyMs">> => {
      const key = process.env.RESEND_API_KEY?.trim();
      if (!key) return { status: "fail", detail: "RESEND_API_KEY no configurada" };

      const from = process.env.EMAIL_FROM?.trim() ?? "";
      // Extrae dominio de "Nombre <user@dominio.com>" o "user@dominio.com"
      const fromDomain = from.match(/@([^\s>]+)/)?.[1]?.toLowerCase() ?? null;

      try {
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (!res.ok) {
          return { status: "fail", detail: `HTTP ${res.status}`, meta: { httpStatus: res.status } };
        }
        const body = (await res.json().catch(() => null)) as {
          data?: Array<{
            name: string;
            status: string;
            capabilities?: { sending?: string; receiving?: string };
          }>;
        } | null;
        const domains = body?.data ?? [];
        if (domains.length === 0) {
          return {
            status: "fail",
            detail: "API OK pero no hay dominios dados de alta en Resend",
            meta: { fromDomain, verifiedCount: 0 },
          };
        }
        // Acepta como "envío OK" tanto "verified" como "partially_verified" si capabilities.sending=enabled
        const sendable = domains.filter(
          (d) => d.status === "verified" || (d.status === "partially_verified" && d.capabilities?.sending === "enabled"),
        );
        const sendableList = sendable.map((d) => d.name).join(",");
        if (!fromDomain) {
          return {
            status: "warn",
            detail: `EMAIL_FROM no configurado · envío habilitado en: ${sendableList || "ninguno"}`,
            meta: { sendable: sendableList },
          };
        }
        const match = sendable.find((d) => d.name === fromDomain);
        if (!match) {
          return {
            status: "fail",
            detail: `EMAIL_FROM usa "${fromDomain}" pero el envío NO está habilitado (sendable: ${sendableList || "ninguno"})`,
            meta: { fromDomain, sendable: sendableList },
          };
        }
        if (match.status === "partially_verified") {
          return {
            status: "warn",
            detail: `${fromDomain} envía OK pero verificación parcial — revisa DMARC/tracking en Resend`,
            meta: { fromDomain, status: match.status },
          };
        }
        return {
          status: "ok",
          detail: `${fromDomain} verificado`,
          meta: { fromDomain, status: match.status },
        };
      } catch (err) {
        return { status: "fail", detail: (err as Error)?.message ?? "Error consultando Resend" };
      }
    },
  },
  {
    id: "integration.openrouter",
    name: "OpenRouter (LLM)",
    category: "integrations",
    run: async () => {
      const key = process.env.OPENROUTER_API_KEY?.trim();
      if (!key) return { status: "fail", detail: "OPENROUTER_API_KEY no configurada" };
      const res = await pingHttp("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return { status: "ok", detail: `HTTP ${res.status}` };
      return {
        status: "fail",
        detail: res.error ?? `HTTP ${res.status}`,
        meta: { httpStatus: res.status },
      };
    },
  },
  {
    id: "integration.heygen",
    name: "HeyGen (avatar videos)",
    category: "integrations",
    run: async () => {
      const key = process.env.HEYGEN_API_KEY?.trim();
      if (!key) return { status: "ok", detail: "No configurada (opcional)" };
      const res = await pingHttp("https://api.heygen.com/v1/user.me", {
        headers: { "x-api-key": key },
      });
      if (res.ok) return { status: "ok", detail: `HTTP ${res.status}` };
      return {
        status: "fail",
        detail: res.error ?? `HTTP ${res.status}`,
        meta: { httpStatus: res.status },
      };
    },
  },
  {
    id: "integration.telegram",
    name: "Telegram Bot",
    category: "integrations",
    run: async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (!token) return { status: "warn", detail: "TELEGRAM_BOT_TOKEN no configurada" };
      const res = await pingHttp(`https://api.telegram.org/bot${token}/getMe`);
      if (res.ok) return { status: "ok", detail: `getMe HTTP ${res.status}` };
      return {
        status: "fail",
        detail: res.error ?? `HTTP ${res.status}`,
        meta: { httpStatus: res.status },
      };
    },
  },
  {
    id: "integration.telegram_webhook",
    name: "Telegram webhook",
    category: "integrations",
    run: async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (!token) return { status: "ok", detail: "No configurado (opcional)" };

      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) {
          return { status: "fail", detail: `HTTP ${r.status}`, meta: { httpStatus: r.status } };
        }
        const body = (await r.json()) as {
          ok: boolean;
          result?: {
            url: string;
            has_custom_certificate?: boolean;
            pending_update_count: number;
            last_error_date?: number;
            last_error_message?: string;
            max_connections?: number;
            ip_address?: string;
          };
        };
        if (!body.ok || !body.result) {
          return { status: "fail", detail: "Respuesta inesperada de Telegram" };
        }
        const { url, pending_update_count, last_error_date, last_error_message } = body.result;
        if (!url) {
          return {
            status: "fail",
            detail: "Webhook sin registrar — el bot no recibirá mensajes",
          };
        }
        const hasRecentError =
          last_error_date &&
          Date.now() / 1000 - last_error_date < 24 * 3600;
        const secretPresent = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim());
        const meta = {
          url,
          pending: pending_update_count,
          secretApplied: secretPresent,
          lastErrorMessage: last_error_message ?? null,
          lastErrorAgoSec: last_error_date ? Math.round(Date.now() / 1000 - last_error_date) : null,
        };
        if (hasRecentError) {
          return {
            status: "warn",
            detail: `Error reciente: ${last_error_message ?? "desconocido"}`,
            meta,
          };
        }
        if (!secretPresent) {
          return {
            status: "warn",
            detail: `Registrado · ${pending_update_count} pendientes · SECRET no aplicado`,
            meta,
          };
        }
        if (pending_update_count > 20) {
          return {
            status: "warn",
            detail: `Registrado · ${pending_update_count} pendientes (backlog)`,
            meta,
          };
        }
        return {
          status: "ok",
          detail: `Registrado · ${pending_update_count} pendientes · secret OK`,
          meta,
        };
      } catch (err) {
        return {
          status: "fail",
          detail: (err as Error)?.message ?? "getWebhookInfo failed",
        };
      }
    },
  },
  {
    id: "integration.stripe",
    name: "Stripe",
    category: "integrations",
    run: async () => {
      const key = process.env.STRIPE_SECRET_KEY?.trim();
      if (!key) return { status: "warn", detail: "STRIPE_SECRET_KEY no configurada" };
      const res = await pingHttp("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return { status: "ok", detail: `HTTP ${res.status}` };
      return {
        status: "fail",
        detail: res.error ?? `HTTP ${res.status}`,
        meta: { httpStatus: res.status },
      };
    },
  },
  {
    id: "integration.google_oauth",
    name: "Google OAuth (env vars)",
    category: "integrations",
    run: async () => {
      const { missing } = envPresent([
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
      ]);
      if (missing.length === 0) return { status: "ok", detail: "Credenciales presentes" };
      return {
        status: "fail",
        detail: `Faltan: ${missing.join(", ")}`,
        meta: { missing: missing.join(",") },
      };
    },
  },
  {
    id: "integration.n8n",
    name: "N8N webhooks (env vars)",
    category: "integrations",
    run: async () => {
      const { missing, present } = envPresent([
        "N8N_EVENTS_WEBHOOK_URL",
        "N8N_ACTION_WEBHOOK",
      ]);
      if (present.length === 0) {
        return { status: "ok", detail: "No configurado (opcional)" };
      }
      if (missing.length > 0) {
        return { status: "warn", detail: `Faltan: ${missing.join(", ")}` };
      }
      return { status: "ok", detail: "Webhooks configurados" };
    },
  },
  {
    id: "integration.web_push",
    name: "Web Push (VAPID)",
    category: "integrations",
    run: async () => {
      const { missing } = envPresent([
        "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
        "VAPID_PRIVATE_KEY",
      ]);
      if (missing.length === 0) return { status: "ok", detail: "VAPID keys presentes" };
      return { status: "fail", detail: `Faltan: ${missing.join(", ")}` };
    },
  },

  // ─── Crons / seguridad ─────────────────────────────────────────────────────
  {
    id: "security.cron_secret",
    name: "CRON_SECRET configurado",
    category: "security",
    run: async () => {
      const secret = process.env.CRON_SECRET?.trim();
      if (!secret) {
        return { status: "fail", detail: "CRON_SECRET vacío — crons sin auth" };
      }
      if (secret.length < 16) {
        return { status: "warn", detail: `CRON_SECRET muy corto (${secret.length} chars)` };
      }
      return { status: "ok", detail: "Secret robusto" };
    },
  },
  {
    id: "security.admin_auth_secret",
    name: "Admin auth secret",
    category: "security",
    run: async () => {
      const secret = (process.env.ADMIN_AUTH_SECRET || process.env.AUTH_TOKEN_SECRET)?.trim();
      if (!secret) return { status: "fail", detail: "Sin ADMIN_AUTH_SECRET ni AUTH_TOKEN_SECRET" };
      if (secret.length < 32) {
        return { status: "warn", detail: `Secret corto (${secret.length} chars)` };
      }
      return { status: "ok", detail: "Secret robusto" };
    },
  },

  // ─── Producto (contadores DB) ──────────────────────────────────────────────
  {
    id: "product.messages_24h",
    name: "Mensajes últimas 24h",
    category: "product",
    run: async () => {
      const prisma = getPrismaClient();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await withTimeout(
        prisma.message.count({ where: { createdAt: { gte: since } } }),
      );
      if (count === 0) {
        return { status: "warn", detail: "0 mensajes en 24h", meta: { count } };
      }
      return { status: "ok", detail: `${count} mensajes`, meta: { count } };
    },
  },
  {
    id: "product.active_users_24h",
    name: "Usuarios activos 24h",
    category: "product",
    run: async () => {
      const prisma = getPrismaClient();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await withTimeout(
        prisma.user.count({ where: { lastSeen: { gte: since } } }),
      );
      return {
        status: count > 0 ? "ok" : "warn",
        detail: `${count} usuarios con lastSeen < 24h`,
        meta: { count },
      };
    },
  },
  {
    id: "product.crisis_24h",
    name: "Eventos de crisis 24h",
    category: "product",
    run: async () => {
      const prisma = getPrismaClient();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await withTimeout(
        prisma.crisisEvent.count({ where: { createdAt: { gte: since } } }),
      );
      return {
        status: "ok",
        detail: count === 0 ? "Sin crisis" : `${count} eventos`,
        meta: { count },
      };
    },
  },
  {
    id: "product.scheduled_emails_pending",
    name: "Emails programados pendientes",
    category: "product",
    run: async () => {
      const prisma = getPrismaClient();
      const count = await withTimeout(
        prisma.scheduledEmail.count({
          where: { sentAt: null, cancelled: false },
        }),
      );
      if (count > 1000) {
        return {
          status: "warn",
          detail: `Cola alta: ${count} pendientes`,
          meta: { count },
        };
      }
      return { status: "ok", detail: `${count} pendientes`, meta: { count } };
    },
  },
  {
    id: "product.avatar_videos_failed",
    name: "Avatar videos fallidos (24h)",
    category: "product",
    run: async () => {
      const prisma = getPrismaClient();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await withTimeout(
        prisma.goalAvatarVideo.count({
          where: { status: "FAILED", updatedAt: { gte: since } },
        }),
      );
      if (count > 0) {
        return { status: "warn", detail: `${count} fallidos`, meta: { count } };
      }
      return { status: "ok", detail: "Sin fallos", meta: { count } };
    },
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runCheck(check: Check): Promise<CheckResult> {
  const started = Date.now();
  try {
    const result = await check.run();
    return {
      id: check.id,
      name: check.name,
      category: check.category,
      latencyMs: Date.now() - started,
      ...result,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logError("STATUS_CHECK", error, { checkId: check.id });
    return {
      id: check.id,
      name: check.name,
      category: check.category,
      latencyMs: Date.now() - started,
      status: "fail",
      detail: message,
    };
  }
}

export async function runAllChecks(): Promise<CheckResult[]> {
  const settled = await Promise.allSettled(CHECKS.map(runCheck));
  return settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    const check = CHECKS[i];
    return {
      id: check.id,
      name: check.name,
      category: check.category,
      latencyMs: 0,
      status: "fail",
      detail: String(s.reason),
    };
  });
}

export function summarize(results: CheckResult[]): {
  ok: number;
  warn: number;
  fail: number;
  skip: number;
  overall: CheckStatus;
} {
  const counts = { ok: 0, warn: 0, fail: 0, skip: 0 };
  for (const r of results) counts[r.status]++;
  const overall: CheckStatus =
    counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "ok";
  return { ...counts, overall };
}
