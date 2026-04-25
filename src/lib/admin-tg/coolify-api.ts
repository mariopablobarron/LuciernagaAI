/**
 * Cliente mínimo para la API HTTP de Coolify v3.
 * Requiere COOLIFY_API_URL (ej: http://72.61.195.108:3000) y COOLIFY_API_TOKEN
 * (Settings → API Tokens en Coolify) configurados como env.
 */

export type RedeployResult =
  | { ok: true; deploymentId?: string; raw?: unknown }
  | { ok: false; error: string };

const DEFAULT_APP_UUID = "cmnc4qjph0006p2a3ggmfdflz"; // luciernaga-ai

function config(): { url: string; token: string; appUuid: string } | null {
  const url = process.env.COOLIFY_API_URL?.trim() || "http://72.61.195.108:3000";
  const token = process.env.COOLIFY_API_TOKEN?.trim();
  const appUuid = process.env.COOLIFY_APP_UUID?.trim() || DEFAULT_APP_UUID;
  if (!token) return null;
  return { url, token, appUuid };
}

export async function triggerForceRedeploy(): Promise<RedeployResult> {
  const cfg = config();
  if (!cfg) {
    return {
      ok: false,
      error:
        "COOLIFY_API_TOKEN no configurado. Crea uno en Coolify → Settings → API Tokens y añádelo en Secrets de la app.",
    };
  }

  // Coolify v3 expone POST /api/v1/deploy?uuid=<app>&force=true (no documentado oficialmente,
  // ruta verificada en código fuente coollabsio/coolify v3.x).
  const endpoint = `${cfg.url.replace(/\/$/, "")}/api/v1/deploy?uuid=${encodeURIComponent(cfg.appUuid)}&force=true`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Coolify HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    const deploymentId =
      parsed && typeof parsed === "object" && "deployments" in parsed
        ? (parsed as { deployments?: Array<{ resource_uuid?: string; deployment_uuid?: string }> }).deployments?.[0]
            ?.deployment_uuid
        : undefined;

    return { ok: true, deploymentId, raw: parsed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
