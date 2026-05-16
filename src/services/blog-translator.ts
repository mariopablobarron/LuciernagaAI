/**
 * Auto-traducción de posts del blog del español a EN/PT-PT/FR.
 *
 * Estrategia:
 *  - Mario escribe un post en ES desde /admin/blog/[id].
 *  - Al guardarlo (o publicarlo), llamamos a este servicio que genera 3
 *    drafts (EN, PT, FR) con el mismo slug pero `status=draft`.
 *  - Mario revisa los drafts en /admin/blog (ya hay filtro por idioma y
 *    badge de bandera) y los publica cuando quedan bien.
 *
 * Idempotencia: si ya existe un post (slug, targetLocale), NO lo sobrescribe.
 * Para regenerar, hay que borrar el destino primero o usar el endpoint
 * /api/admin/blog/[id]/translate con `force: true`.
 *
 * Coste: 1 llamada Haiku por idioma = ~3 llamadas por post (~$0.01–0.03).
 * Latencia: 5–15s por idioma. Se ejecuta en background (fire-and-forget).
 */

import { logError, logInfo } from "@/lib/logger";
import { getOpenRouterChatUrl, getOpenRouterHeaders, getOpenRouterModel } from "@/lib/openrouter";
import { getPrismaClient } from "@/db/prisma";
import { BRAND_NAME, type EmailLocale } from "@/lib/email-i18n";
import type { Block } from "@blocknote/core";

const OPENROUTER_MODEL = getOpenRouterModel("anthropic/claude-haiku-4-5");
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_TOKENS = 4096;

export type TargetLocale = Exclude<EmailLocale, "es">; // traducimos DESDE es a [en, pt, fr]
export const TARGET_LOCALES: TargetLocale[] = ["en", "pt", "fr"];

// ─── Prompts por idioma (voz de marca) ───────────────────────────────────────
//
// Cada uno hereda el cuidado idiomático del resto del sitio:
//   - PT-PT estricto: tu + enclisis, sin "você", ortografía portuguesa
//     (deteção, ação, projeto, ficheiro, ecrã, definições)
//   - FR-FR: tutoiement, sin vouvoiement
//   - EN-US: directo, "you"
// El nombre de marca se traduce según BRAND_NAME (importado de email-i18n).

const TRANSLATION_GUIDELINES: Record<TargetLocale, string> = {
  en: `Translate to American English. Use "you" directly (no formal "one" or passive). Voice: direct, warm but not corny. Keep the original's bite: questions that confront, not platitudes. Brand name: "${BRAND_NAME.en}". Crisis resources (only if mentioned in original): 988 (US Suicide & Crisis Lifeline), 911 emergencies. Don't water down: if the original is challenging, keep it challenging.`,
  pt: `Traduz para português europeu (PT-PT), NÃO português do Brasil. Usa "tu" e ênclise sempre que aplicável (ex: "diz-me", "ajuda-te", "responde-me"). NUNCA uses "você". Vocabulário PT-PT: deteção, ação, projeto, ficheiro, ecrã, definições, palavra-passe, utilizador, telemóvel, equipa. Marca: "${BRAND_NAME.pt}". Recursos de crise (só se aparecerem no original): SNS 24 (808 24 24 24), SOS Voz Amiga (213 544 545), 112. Mantém a voz direta do original — sem suavizar.`,
  fr: `Traduis en français de France. Utilise le tutoiement systématiquement ("tu", "ton", "tes", "te") — JAMAIS le vouvoiement. Voix : directe, chaleureuse mais sans sentimentalisme. Marque : "${BRAND_NAME.fr}". Ressources de crise (uniquement si présentes dans l'original) : 3114 (Numéro national de prévention du suicide), SOS Amitié (09 72 39 40 50), 112. Garde le mordant de l'original — pas de phrases plates.`,
};

const SYSTEM_PROMPT = `Eres un traductor especializado del blog "Tres Mil Millones de Latidos" (un mentor con IA para claridad y acción, audiencia 18-35 años).

Tu trabajo: traducir un post del blog del español al idioma destino MANTENIENDO la voz de marca y la estructura JSON BlockNote intacta.

REGLAS NO NEGOCIABLES:
1. Voz de marca: directa, interpeladora, sin paja motivacional. El original pregunta más que instruye — preserva eso.
2. NUNCA cambies la estructura JSON. Solo traduce los valores de "text" dentro de cada bloque. Mantén exactamente los mismos types, ids, props, listLevel, etc.
3. NUNCA inventes contenido. Si el original dice X, di X en el idioma destino. No añadas, no resumas.
4. URLs, números de teléfono, emails y nombres propios NO se traducen (excepto el nombre de marca, que tiene equivalente oficial — ver guideline por idioma).
5. NUNCA traduzcas "Tres Mil Millones de Latidos" literalmente — usa el equivalente de marca del idioma destino.
6. Devuelve SOLO el JSON, sin markdown, sin comentarios, sin \`\`\`.

DEVUELVE este JSON exacto:
{
  "title": "<título traducido>",
  "excerpt": "<resumen traducido o null>",
  "blocks": [<array de blocks BlockNote traducidos, MISMA estructura>],
  "content": "<plain text del cuerpo traducido, para fallback de búsqueda>"
}`;

function buildUserPrompt(
  srcPost: { title: string; excerpt: string | null; content: string; blocks: Block[] | null },
  targetLocale: TargetLocale,
): string {
  return [
    `IDIOMA DESTINO: ${targetLocale}`,
    ``,
    `Guidelines de marca para este idioma:`,
    TRANSLATION_GUIDELINES[targetLocale],
    ``,
    `POST ORIGINAL (español):`,
    JSON.stringify(
      {
        title: srcPost.title,
        excerpt: srcPost.excerpt,
        blocks: srcPost.blocks,
        content: srcPost.content,
      },
      null,
      2,
    ),
    ``,
    `Devuelve SOLO el JSON traducido (sin markdown ni comentarios).`,
  ].join("\n");
}

type TranslatedPost = {
  title: string;
  excerpt: string | null;
  blocks: Block[] | null;
  content: string;
};

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  feature: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(getOpenRouterChatUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...getOpenRouterHeaders(apiKey, { feature }),
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": "mentor-web",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        // OpenRouter respeta este hint para modelos que lo soportan.
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("OpenRouter empty reply");
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extrae el JSON de la respuesta del LLM. Tolera que venga con markdown
 * fences accidentales o texto prefijo/sufijo aunque el system prompt lo prohíba.
 */
function parseJSONLoosely(raw: string): TranslatedPost {
  let candidate = raw.trim();
  // Quitar ```json ... ``` o ``` ... ``` si los hay
  const fenceMatch = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) candidate = fenceMatch[1].trim();
  // Si todavía hay texto antes del primer "{" o después del último "}", recortar
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace > 0 || lastBrace < candidate.length - 1) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }
  const parsed = JSON.parse(candidate) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { title?: unknown }).title !== "string"
  ) {
    throw new Error("LLM returned invalid translation shape (missing title)");
  }
  const obj = parsed as Partial<TranslatedPost>;
  return {
    title: String(obj.title ?? "").trim(),
    excerpt: typeof obj.excerpt === "string" ? obj.excerpt : null,
    blocks: Array.isArray(obj.blocks) ? (obj.blocks as Block[]) : null,
    content: typeof obj.content === "string" ? obj.content : "",
  };
}

/**
 * Traduce el contenido de un post a un idioma destino. Sin efectos
 * secundarios — el caller decide si lo persiste.
 */
export async function translatePostContent(
  srcPost: { title: string; excerpt: string | null; content: string; blocks: Block[] | null },
  targetLocale: TargetLocale,
): Promise<TranslatedPost> {
  const reply = await callOpenRouter(
    SYSTEM_PROMPT,
    buildUserPrompt(srcPost, targetLocale),
    `blog_translate_${targetLocale}`,
  );
  return parseJSONLoosely(reply);
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

type SourcePost = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string;
  blocks: unknown;
  coverImage: string | null;
  tags: string[];
  authorName: string;
};

export type TranslationOutcome = {
  targetLocale: TargetLocale;
  status: "created" | "skipped_exists" | "skipped_not_es_source" | "regenerated" | "error";
  postId?: string;
  error?: string;
};

/**
 * Genera y persiste traducciones de un post fuente a los idiomas target.
 *
 * - `force=false` (default): si ya existe un post en (slug, targetLocale), lo
 *   deja como está y devuelve `skipped_exists`. Idempotente y seguro.
 * - `force=true`: sobrescribe el contenido del destino, manteniendo su id y
 *   status. Útil cuando se actualiza el ES y se quiere refrescar las
 *   traducciones (Mario lo dispara desde el botón "Regenerar").
 *
 * IMPORTANTE: las traducciones se crean con `status="draft"` para que Mario
 * las revise antes de que sean visibles al público.
 */
export async function translatePostToAllLocales(
  sourcePostId: string,
  options: { force?: boolean; targetLocales?: TargetLocale[] } = {},
): Promise<TranslationOutcome[]> {
  const prisma = getPrismaClient();
  const targets = options.targetLocales ?? TARGET_LOCALES;
  const force = options.force ?? false;

  const source = (await prisma.blogPost.findUnique({
    where: { id: sourcePostId },
    select: {
      id: true,
      slug: true,
      locale: true,
      title: true,
      excerpt: true,
      content: true,
      blocks: true,
      coverImage: true,
      tags: true,
      authorName: true,
    },
  })) as SourcePost | null;

  if (!source) {
    throw new Error(`Source post ${sourcePostId} not found`);
  }
  if (source.locale !== "es") {
    return targets.map((t) => ({ targetLocale: t, status: "skipped_not_es_source" as const }));
  }

  const results: TranslationOutcome[] = [];

  for (const targetLocale of targets) {
    try {
      const existing = await prisma.blogPost.findUnique({
        where: { slug_locale: { slug: source.slug, locale: targetLocale } },
        select: { id: true },
      });

      if (existing && !force) {
        results.push({ targetLocale, status: "skipped_exists", postId: existing.id });
        continue;
      }

      const translated = await translatePostContent(
        {
          title: source.title,
          excerpt: source.excerpt,
          content: source.content,
          blocks: (source.blocks as Block[] | null) ?? null,
        },
        targetLocale,
      );

      if (existing && force) {
        // Sobrescribir el destino sin tocar status — si Mario ya lo publicó,
        // sigue publicado con el contenido refrescado.
        await prisma.blogPost.update({
          where: { id: existing.id },
          data: {
            title: translated.title,
            excerpt: translated.excerpt,
            content: translated.content,
            blocks: translated.blocks ?? undefined,
          },
        });
        results.push({ targetLocale, status: "regenerated", postId: existing.id });
        logInfo("BLOG_TRANSLATOR", "regenerated", { sourcePostId, targetLocale });
      } else {
        const created = await prisma.blogPost.create({
          data: {
            slug: source.slug,
            locale: targetLocale,
            title: translated.title,
            excerpt: translated.excerpt,
            content: translated.content,
            blocks: translated.blocks ?? undefined,
            // Heredamos cosas que no se traducen.
            coverImage: source.coverImage,
            tags: source.tags,
            authorName: source.authorName,
            // SIEMPRE draft — Mario debe revisar antes de publicar.
            status: "draft",
            publishedAt: null,
          },
          select: { id: true },
        });
        results.push({ targetLocale, status: "created", postId: created.id });
        logInfo("BLOG_TRANSLATOR", "created", { sourcePostId, targetLocale, newPostId: created.id });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError("BLOG_TRANSLATOR", err, { sourcePostId, targetLocale });
      results.push({ targetLocale, status: "error", error: message });
    }
  }

  return results;
}
