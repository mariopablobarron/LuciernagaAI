/**
 * Glosario de temas trabajables — detección desde BD (editable en /admin/glosario).
 *
 * Cuando el usuario expresa en el chat uno de los `triggers` de un tema
 * (síndrome del impostor, etc.), el mentor recibe la guía psicoeducativa del
 * tema y puede ofrecer su ejercicio curado. El catálogo vive en la tabla
 * GlossaryTopic y lo cura el equipo humano (roles content/clinical) sin
 * redeploy.
 *
 * Diseño:
 *  - Matching por FRASE en lenguaje natural (texto plano, no regex): se
 *    normaliza el mensaje y cada disparador (NFD, minúsculas, sin puntuación)
 *    y se busca la frase como secuencia de palabras (límite \b). Es lo más
 *    predecible para un editor no técnico; no dejamos que el admin escriba
 *    regex (se escapa siempre).
 *  - Caché in-process con TTL 60s invalidado en escritura (patrón alerts-fire).
 *    La detección corre en cada mensaje del chat; sin caché sería un findMany
 *    por turno.
 *
 * BARANDILLA (AI Act / honestidad relacional): esto es PSICOEDUCACIÓN, no
 * diagnóstico. La guía (mentorGuidance) debe pedir al mentor ofrecer el tema
 * como hipótesis y no etiquetar a la persona. El material es curado y
 * revisable por humanos, no psicoterapia improvisada por el LLM.
 */

export type GlossaryTopicData = {
  slug: string;
  label: string;
  triggers: string[];
  mentorGuidance: string;
  exerciseTitle: string;
  exerciseGoal: string;
  exerciseSteps: string[];
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,!¡¿?…;:()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Devuelve los temas cuyo disparador aparece (como secuencia de palabras) en
 * el mensaje. Lógica pura y testeable sin BD.
 */
export function matchGlossaryTopics(
  message: string,
  topics: GlossaryTopicData[],
): GlossaryTopicData[] {
  const norm = normalizeText(message);
  if (!norm) return [];
  return topics.filter((topic) =>
    topic.triggers.some((trigger) => {
      const phrase = normalizeText(trigger);
      if (!phrase) return false;
      return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(norm);
    }),
  );
}

// ─── Caché in-process (patrón alerts-fire.ts) ───────────────────────────────

const CACHE_TTL_MS = 60_000;
let cache: GlossaryTopicData[] = [];
let cachedAt = 0;
let refreshing = false;

export async function loadEnabledGlossaryTopics(): Promise<GlossaryTopicData[]> {
  const now = Date.now();
  // cachedAt > 0 (no length) para no martillear la BD cuando el glosario
  // está genuinamente vacío.
  if (!refreshing && cachedAt > 0 && now - cachedAt < CACHE_TTL_MS) return cache;
  if (refreshing) return cache;
  refreshing = true;
  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    const rows = await prisma.glossaryTopic.findMany({
      where: { enabled: true },
      select: {
        slug: true,
        label: true,
        triggers: true,
        mentorGuidance: true,
        exerciseTitle: true,
        exerciseGoal: true,
        exerciseSteps: true,
      },
    });
    cache = rows;
    cachedAt = now;
  } catch {
    // Fallo de BD: conserva la caché previa (fallback seguro).
  } finally {
    refreshing = false;
  }
  return cache;
}

/** Detecta los temas del glosario presentes en el mensaje del usuario. */
export async function detectGlossaryTopics(message: string): Promise<GlossaryTopicData[]> {
  const topics = await loadEnabledGlossaryTopics();
  return matchGlossaryTopics(message, topics);
}

export function invalidateGlossaryCache(): void {
  cachedAt = 0;
}
