/**
 * Cliente HTTP base para ElevenLabs.
 *
 * Centraliza: header xi-api-key, timeout, mapeo de errores HTTP a
 * tipos discriminados para que los callers manejen casos sin try/catch
 * en cada endpoint.
 *
 * Errores discriminados:
 *  - "missing_key": no hay ELEVENLABS_API_KEY (config error, no del usuario)
 *  - "quota_exceeded": HTTP 401 con detail.status="quota_exceeded" (saldo agotado)
 *  - "rate_limited": HTTP 429 (rate limit del proveedor, no nuestro)
 *  - "bad_request": HTTP 400 (input inválido)
 *  - "not_found": HTTP 404 (voice_id inexistente, etc.)
 *  - "network": fallo de red / timeout
 *  - "unknown": otro HTTP no clasificado
 */

const API_BASE = "https://api.elevenlabs.io";
const DEFAULT_TIMEOUT_MS = 30_000;

export type ElevenLabsErrorKind =
  | "missing_key"
  | "quota_exceeded"
  | "rate_limited"
  | "bad_request"
  | "not_found"
  | "network"
  | "unknown";

export class ElevenLabsError extends Error {
  kind: ElevenLabsErrorKind;
  status?: number;
  body?: string;
  constructor(kind: ElevenLabsErrorKind, message: string, opts?: { status?: number; body?: string }) {
    super(message);
    this.kind = kind;
    this.status = opts?.status;
    this.body = opts?.body;
  }
}

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new ElevenLabsError("missing_key", "ELEVENLABS_API_KEY no está configurada en el entorno");
  }
  return key;
}

type FetchOpts = {
  method: "GET" | "POST";
  path: string;
  /** JSON body (será stringificado y se setea Content-Type: application/json). */
  json?: unknown;
  /** FormData body (Content-Type lo pone fetch automáticamente con boundary). */
  formData?: FormData;
  /** Si true, no parseamos como JSON — devolvemos el Response crudo. Útil para audio streams. */
  raw?: boolean;
  timeoutMs?: number;
};

/**
 * Llama a un endpoint de ElevenLabs. Devuelve el JSON parseado o, si
 * raw=true, el Response crudo para que el caller pueda streamear el body.
 *
 * Errores: lanza ElevenLabsError con `kind` para discriminar el motivo.
 */
export async function callElevenLabs(opts: FetchOpts): Promise<unknown | Response> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = {
    "xi-api-key": apiKey,
    "User-Agent": "tresmilmillonesdelatidos/1.0",
  };
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  // Para FormData NO seteamos Content-Type — fetch lo pone con boundary.

  let body: BodyInit | undefined;
  if (opts.json !== undefined) body = JSON.stringify(opts.json);
  else if (opts.formData) body = opts.formData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${opts.path}`, {
      method: opts.method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    throw new ElevenLabsError("network", `Fallo de red llamando a ElevenLabs: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const kind: ElevenLabsErrorKind = (() => {
      if (res.status === 400) return "bad_request";
      if (res.status === 401) {
        // ElevenLabs distingue 401 unauthenticated vs quota exceeded.
        try {
          const parsed = JSON.parse(text);
          if (parsed?.detail?.status === "quota_exceeded") return "quota_exceeded";
        } catch {/* ignore */ }
        return "unknown";
      }
      if (res.status === 404) return "not_found";
      if (res.status === 429) return "rate_limited";
      return "unknown";
    })();
    throw new ElevenLabsError(
      kind,
      `ElevenLabs HTTP ${res.status}: ${text.slice(0, 200)}`,
      { status: res.status, body: text },
    );
  }

  if (opts.raw) return res;
  return res.json();
}
