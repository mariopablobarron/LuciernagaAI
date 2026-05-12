/**
 * LLM scorer + drafter para discovery matches.
 *
 * Hace UNA sola llamada por match con structured output:
 *   - score (0-10): relevancia para el producto
 *   - reason: por qué ese score
 *   - draft: borrador de respuesta en voz de marca (interpela, no aconseja)
 *
 * Usa Haiku 4.5 — barato, rápido, suficiente para este caso.
 * Coste estimado: ~$0.0002 por match. 100 matches/día → $0.02/día.
 *
 * El borrador NUNCA se publica solo. Es punto de partida para que Mario
 * apruebe/edite/rechace.
 */

import { getOpenRouterChatUrl, getOpenRouterHeaders, getOpenRouterModel } from "@/lib/openrouter";
import { logError } from "@/lib/logger";

const MODEL = getOpenRouterModel("anthropic/claude-haiku-4-5");
const TIMEOUT_MS = 30_000;

export type ScoringInput = {
  platform: string; // "reddit" | "hn"
  subredditOrTag: string;
  title: string;
  excerpt: string;
};

export type ScoringResult = {
  score: number; // 0-10
  reason: string;
  draftResponse: string;
};

const SYSTEM_PROMPT = `Eres el asistente de marketing de Tres Mil Millones de Latidos, un acompañante con IA para procesos emocionales (ansiedad, bloqueos, procrastinación, claridad). Marco pedagógico: INTERPELA, no aconseja. PREGUNTA, no diagnostica. Tono respetuoso y directo, sin autoayuda barata, sin emojis chillones.

Tu trabajo: evaluar si un post de foro es buena oportunidad para una respuesta humana de Mario (fundador) que aporte valor REAL al hilo y mencione el producto de forma orgánica (no spam).

DEVUELVE JSON ESTRICTO con esta forma exacta:
{
  "score": 0-10,
  "reason": "explicación corta de por qué ese score",
  "draft": "borrador de respuesta en voz de marca, o string vacío si score < 6"
}

CRITERIOS DE SCORE:
- 9-10: persona en momento exacto de búsqueda activa; pide ayuda en un dominio donde el producto encaja; OP probablemente recibirá la respuesta bien.
- 7-8: relevancia clara, pero conversación más larga o derivada.
- 5-6: tangencial; mejor saltar a menos que sea muy fresco.
- 0-4: irrelevante, troll, ya tiene respuesta exhaustiva, vendría como spam.

REGLAS DEL DRAFT (cuando score >= 6):
- 4-8 frases máximo. Conciso.
- Empieza validando lo que cuenta el OP sin condescender ni dar "abrazos".
- Aporta UNA observación o pregunta concreta que abra perspectiva (interpela).
- Solo entonces, una línea suave sobre el producto: "Si te ayuda probar una conversación con algo que te pregunte en vez de aconsejarte, en tresmilmillonesdelatidos.es hay un chat anónimo que hace eso". Ni más fuerte.
- NUNCA suene a copy publicitario. Suena a persona real que conoce el producto porque lo construyó.
- NUNCA prometas curación, ni diagnóstico, ni resultados. Si OP describe crisis (ideación, autolesión, riesgo) → score alto pero el draft debe derivar al Teléfono de la Esperanza (717 003 717) y SOLO mencionar el producto como acompañamiento entre llamadas, nunca como reemplazo.
- NUNCA des consejos clínicos. NUNCA digas "deberías ver a un psicólogo" salvo en crisis evidente.

EJEMPLO BUENO (score 9 sobre post: "llevo 3 meses sin poder empezar la TFM, no es vagancia, es algo más"):
{
  "score": 9,
  "reason": "Persona claramente bloqueada, sabe que no es vagancia, busca entender qué le pasa. Encaja exacto.",
  "draft": "Tres meses no es procrastinación, es información. Cuando algo se nos atasca tanto, suele ser porque la tarea está conectada con algo más grande: miedo a terminar la carrera, a lo que viene después, a defraudar a alguien. Una pregunta que a veces ayuda: si mañana entregaras el TFM hecho sin tener que hacerlo, ¿qué sentirías primero, alivio o vacío? La respuesta suele aclarar bastante. Hay un chat que precisamente hace ese tipo de pregunta sin pretender diagnosticarte, por si te sirve probar antes de pelearte otra vez con el documento: tresmilmillonesdelatidos.es (gratis, anónimo)."
}

NO añadas markdown, ni \`\`\`json, ni texto fuera del objeto JSON.`;

function buildUserPrompt(input: ScoringInput): string {
  return [
    `Plataforma: ${input.platform} (${input.subredditOrTag})`,
    `Título: ${input.title}`,
    `Cuerpo del post:`,
    input.excerpt,
  ].join("\n");
}

export async function scoreAndDraft(input: ScoringInput): Promise<ScoringResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    logError("DISCOVERY", new Error("OPENROUTER_API_KEY missing"), { stage: "score" });
    return null;
  }

  const url = getOpenRouterChatUrl();
  const headers = getOpenRouterHeaders(apiKey, { feature: "discovery_score" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logError("DISCOVERY", new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`), { stage: "score" });
      return null;
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      logError("DISCOVERY", new Error("LLM empty response"), { stage: "score" });
      return null;
    }

    let parsed: { score?: number; reason?: string; draft?: string };
    try {
      parsed = JSON.parse(content) as typeof parsed;
    } catch {
      logError("DISCOVERY", new Error("LLM returned non-JSON"), { stage: "score", preview: content.slice(0, 200) });
      return null;
    }

    const score = Number.isFinite(parsed.score) ? Math.max(0, Math.min(10, Math.round(parsed.score!))) : 0;
    return {
      score,
      reason: (parsed.reason ?? "").slice(0, 500),
      draftResponse: (parsed.draft ?? "").slice(0, 2000),
    };
  } catch (e) {
    logError("DISCOVERY", e, { stage: "score" });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
