/**
 * Resend domain health monitor.
 *
 * Checks that the Resend sending domain is fully verified (all DNS records OK).
 * If the domain drops below "verified" status, sends a Telegram alert with the
 * failing records so the issue can be diagnosed immediately.
 *
 * Called by /api/cron/email-health-check every 6 hours.
 */
import { createHmac } from "crypto";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";

type ResendRecord = {
  type: string;
  name: string;
  value: string;
  status: "verified" | "pending" | "failed" | "not_started";
};

type ResendDomain = {
  id: string;
  name: string;
  status: "verified" | "partially_verified" | "failed" | "pending" | "temporary_failure";
  records: ResendRecord[];
};

const RESEND_URL = "https://api.resend.com";
const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000; // alert máximo 1 vez cada 12h

function getApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

function getDomainId(): string | null {
  return process.env.RESEND_DOMAIN_ID?.trim() || null;
}

/** Genera una clave de dedup para no spamear el mismo estado */
function dedupKey(domainName: string, status: string): string {
  return createHmac("sha256", "email-health-dedup")
    .update(`${domainName}:${status}`)
    .digest("hex")
    .slice(0, 16);
}

export type EmailHealthResult =
  | { ok: true; status: string; domainName: string }
  | { ok: false; status: string; domainName: string; failingRecords: string[]; alerted: boolean };

/**
 * Verifica el estado del dominio Resend y alerta si no está completamente verificado.
 * Retorna ok:true solo si status === "verified".
 */
export async function checkResendDomainHealth(): Promise<EmailHealthResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logWarn("EMAIL_HEALTH", "resend_api_key_missing", { warn: "RESEND_API_KEY no configurado" });
    return { ok: false, status: "no_api_key", domainName: "unknown", failingRecords: [], alerted: false };
  }

  const domainId = getDomainId();
  if (!domainId) {
    // Sin domain ID explícito, buscar en la lista
    return checkByListing(apiKey);
  }

  return checkById(apiKey, domainId);
}

async function checkById(apiKey: string, domainId: string): Promise<EmailHealthResult> {
  try {
    const res = await fetch(`${RESEND_URL}/domains/${domainId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logWarn("EMAIL_HEALTH", "resend_api_error", { status: res.status, body: text.slice(0, 200) });
      return { ok: false, status: `api_error_${res.status}`, domainName: domainId, failingRecords: [], alerted: false };
    }
    const domain = (await res.json()) as ResendDomain;
    return evaluateDomain(apiKey, domain);
  } catch (error) {
    logError("EMAIL_HEALTH", error, { stage: "checkById" });
    return { ok: false, status: "network_error", domainName: domainId, failingRecords: [], alerted: false };
  }
}

async function checkByListing(apiKey: string): Promise<EmailHealthResult> {
  try {
    const res = await fetch(`${RESEND_URL}/domains`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logWarn("EMAIL_HEALTH", "resend_list_error", { status: res.status, body: text.slice(0, 200) });
      return { ok: false, status: `api_error_${res.status}`, domainName: "unknown", failingRecords: [], alerted: false };
    }
    const { data } = (await res.json()) as { data: ResendDomain[] };
    if (!data?.length) {
      return { ok: false, status: "no_domains", domainName: "unknown", failingRecords: [], alerted: false };
    }

    // Preferir el dominio del env APP_BASE_URL / dominio configurado
    const appDomain = process.env.APP_BASE_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    const domain = (appDomain && data.find((d) => d.name === appDomain)) ?? data[0] ?? null;
    if (!domain) {
      return { ok: false, status: "no_domains", domainName: "unknown", failingRecords: [], alerted: false };
    }
    return evaluateDomain(apiKey, domain);
  } catch (error) {
    logError("EMAIL_HEALTH", error, { stage: "checkByListing" });
    return { ok: false, status: "network_error", domainName: "unknown", failingRecords: [], alerted: false };
  }
}

async function evaluateDomain(apiKey: string, domain: ResendDomain): Promise<EmailHealthResult> {
  if (domain.status === "verified") {
    logInfo("EMAIL_HEALTH", "domain_ok", { domain: domain.name, status: domain.status });
    return { ok: true, status: domain.status, domainName: domain.name };
  }

  // No está 100% verificado — determinar qué falla
  const failingRecords = (domain.records ?? [])
    .filter((r) => r.status !== "verified")
    .map((r) => `${r.type} \`${r.name}\` → *${r.status}*`);

  logWarn("EMAIL_HEALTH", "domain_not_verified", {
    domain: domain.name,
    status: domain.status,
    failingRecords,
  });

  // Intentar auto-remediar: forzar re-verificación en Resend
  let reVerified = false;
  try {
    const verifyRes = await fetch(`${RESEND_URL}/domains/${domain.id}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (verifyRes.ok) {
      // Esperar 3s y comprobar de nuevo
      await new Promise((r) => setTimeout(r, 3000));
      const recheckRes = await fetch(`${RESEND_URL}/domains/${domain.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
      if (recheckRes.ok) {
        const recheckDomain = (await recheckRes.json()) as ResendDomain;
        if (recheckDomain.status === "verified") {
          reVerified = true;
          logInfo("EMAIL_HEALTH", "domain_auto_recovered", { domain: domain.name });
        }
      }
    }
  } catch {
    // no-op — si falla el re-verify seguimos con la alerta
  }

  if (reVerified) {
    return { ok: true, status: "verified_after_retry", domainName: domain.name };
  }

  // Enviar alerta por Telegram (con dedup para no spamear)
  let alerted = false;
  try {
    const key = dedupKey(domain.name, domain.status);
    // Usar SystemLog como dedup store
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();

    const existing = await prisma.systemLog.findFirst({
      where: {
        tag: "EMAIL_HEALTH_ALERT",
        message: key,
        timestamp: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
      },
    });

    if (!existing) {
      const lines = [
        `🚨 *Email: dominio Resend no verificado*`,
        ``,
        `Dominio: \`${domain.name}\``,
        `Estado: \`${domain.status}\``,
        ``,
        `Registros con problema:`,
        ...failingRecords.map((r) => `  • ${r}`),
        ``,
        `Acción: entrar a resend.com/domains y pulsar "Verify".`,
        `Si el DNS es correcto, el dominio se verificará solo.`,
      ];
      await notifyAdmin(lines.join("\n"));

      await prisma.systemLog.create({
        data: {
          level: "warn",
          tag: "EMAIL_HEALTH_ALERT",
          message: key,
          context: { domain: domain.name, status: domain.status, failingRecords },
        },
      });
      alerted = true;
    }
  } catch (error) {
    logError("EMAIL_HEALTH", error, { stage: "telegram_alert" });
  }

  return { ok: false, status: domain.status, domainName: domain.name, failingRecords, alerted };
}
