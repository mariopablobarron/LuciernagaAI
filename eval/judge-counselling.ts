/**
 * LLM-as-judge para outputs de Counselling Bench.
 *
 * Toma un .jsonl producido por run-counselling-bench.ts y pasa cada par
 * (query, response) por Claude con una rúbrica explícita. Devuelve scores
 * 1-5 por criterio + razonamiento corto. Output: eval/results/judged_<ts>.jsonl.
 *
 * Uso:
 *   OPENROUTER_API_KEY=... npx tsx eval/judge-counselling.ts <input.jsonl>
 *   OPENROUTER_API_KEY=... npx tsx eval/judge-counselling.ts <input.jsonl> --limit 20
 *
 * Rúbrica (5 criterios, escala 1-5):
 *   1. interpelacion       — ¿hace preguntas o da consejos directos?
 *   2. validacion          — ¿reconoce la emoción antes de actuar?
 *   3. concrecion          — ¿propone UNA acción concreta y pequeña?
 *   4. brevedad            — ¿4-6 frases o se va a discurso?
 *   5. ausencia_jerga      — ¿conversación natural o headers/labels visibles?
 *
 * Coste estimado (100 pares con claude-sonnet-4-6 como juez): ~$0.40-0.80.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

type InputEntry = {
  question_id: number;
  category: string;
  query: string;
  response: string;
  fallback?: boolean;
};

type Scores = {
  interpelacion: number;
  validacion: number;
  concrecion: number;
  brevedad: number;
  ausencia_jerga: number;
};

type JudgedEntry = InputEntry & {
  scores?: Scores;
  reasoning?: string;
  judgeError?: string;
  judgeLatencyMs: number;
};

const RUBRIC_PROMPT = `Eres un evaluador clínico-pedagógico que puntúa la calidad de respuestas de un mentor digital con IA orientado a salud mental ligera (NO terapia). El mentor opera bajo un marco específico:

- "Interpelar > instruir": prefiere preguntas socráticas que llevan al usuario a descubrir, antes que dar consejos directos.
- "Claridad > consuelo": no busca calmar con frases vacías sino ordenar pensamiento.
- Brevedad obligatoria (4-6 frases máximo).
- UNA sola pregunta de cierre, no varias.
- Conversación natural, sin headers tipo "**Reflejo:**" "**Acción:**" "**Pregunta:**" (eso es jerga de coaching).
- Acción concreta y pequeña ("hoy escribe una frase…") en lugar de generalizaciones ("practica mindfulness").

Tu trabajo: puntuar la respuesta del mentor en 5 criterios, escala 1 (muy mal) a 5 (excelente).

Criterios:
1. **interpelacion**: ¿la respuesta interpela al usuario con preguntas o le da consejos directos? Alta=preguntas socráticas; Baja=lista de consejos.
2. **validacion**: ¿reconoce la emoción/situación del usuario ANTES de actuar? Alta=valida sin trivializar; Baja=salta directo a soluciones o ignora la emoción.
3. **concrecion**: ¿propone UNA acción concreta, pequeña y observable? Alta=acción específica para hoy; Baja=consejo genérico ("trabaja en ti", "practica autocuidado").
4. **brevedad**: ¿se mantiene en 4-6 frases o se va a discurso largo? Alta=denso y conciso; Baja=muros de texto.
5. **ausencia_jerga**: ¿es conversación natural o expone andamiaje (Reflejo, Porqué, Acción, Pregunta, Validación, Microacción como headers)? Alta=natural; Baja=usa headers Markdown o labels visibles.

Devuelve EXCLUSIVAMENTE JSON válido con esta estructura, sin texto antes ni después:

{
  "interpelacion": 4,
  "validacion": 5,
  "concrecion": 3,
  "brevedad": 4,
  "ausencia_jerga": 5,
  "reasoning": "Una frase corta justificando los puntos más bajos."
}`;

function parseArgs(argv: string[]): { input: string; limit: number; concurrency: number } {
  let input = "";
  let limit = Number.POSITIVE_INFINITY;
  let concurrency = 3;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit" && argv[i + 1]) limit = Math.max(1, Number(argv[i + 1]));
    else if (a === "--concurrency" && argv[i + 1]) concurrency = Math.max(1, Number(argv[i + 1]));
    else if (!a.startsWith("--") && !input) input = a;
  }
  return { input, limit, concurrency };
}

function loadJsonl(path: string): InputEntry[] {
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as InputEntry);
}

async function processWithLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

const JUDGE_MODEL = process.env.OPENROUTER_JUDGE_MODEL?.trim() || "anthropic/claude-sonnet-4-6";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

async function judgeOne(entry: InputEntry): Promise<JudgedEntry> {
  const t0 = Date.now();

  if (entry.fallback || !entry.response) {
    return {
      ...entry,
      judgeError: "skip_fallback",
      judgeLatencyMs: Date.now() - t0,
    };
  }

  const userMsg = `QUERY DEL USUARIO:
${entry.query}

RESPUESTA DEL MENTOR:
${entry.response}`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RUBRIC_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      return {
        ...entry,
        judgeError: `http_${res.status}`,
        judgeLatencyMs: Date.now() - t0,
      };
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices[0]?.message?.content ?? "{}";
    // El modelo a veces añade markdown ```json ```
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { reasoning?: string } & Partial<Scores>;
    const scores: Scores = {
      interpelacion: clampScore(parsed.interpelacion),
      validacion: clampScore(parsed.validacion),
      concrecion: clampScore(parsed.concrecion),
      brevedad: clampScore(parsed.brevedad),
      ausencia_jerga: clampScore(parsed.ausencia_jerga),
    };

    return {
      ...entry,
      scores,
      reasoning: parsed.reasoning,
      judgeLatencyMs: Date.now() - t0,
    };
  } catch (error) {
    return {
      ...entry,
      judgeError: error instanceof Error ? error.message : String(error),
      judgeLatencyMs: Date.now() - t0,
    };
  }
}

function clampScore(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function summarize(rows: JudgedEntry[]) {
  const scored = rows.filter((r) => r.scores);
  if (scored.length === 0) return null;
  const keys: (keyof Scores)[] = ["interpelacion", "validacion", "concrecion", "brevedad", "ausencia_jerga"];
  const avg: Record<string, number> = {};
  for (const k of keys) {
    const sum = scored.reduce((s, r) => s + (r.scores![k] ?? 0), 0);
    avg[k] = Number((sum / scored.length).toFixed(2));
  }
  const overall = Number(
    (keys.reduce((s, k) => s + avg[k], 0) / keys.length).toFixed(2),
  );
  return { n: scored.length, errors: rows.length - scored.length, avg, overall };
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error("ERROR: OPENROUTER_API_KEY no configurada.");
    process.exit(1);
  }

  const { input, limit, concurrency } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error("Uso: tsx eval/judge-counselling.ts <input.jsonl> [--limit N] [--concurrency N]");
    process.exit(1);
  }

  const inputAbs = input.startsWith("/") ? input : join(process.cwd(), input);
  const entries = loadJsonl(inputAbs).slice(0, limit);

  console.log(`LLM-as-judge`);
  console.log(`  input:       ${input}`);
  console.log(`  entries:     ${entries.length}`);
  console.log(`  judge model: ${JUDGE_MODEL}`);
  console.log(`  concurrency: ${concurrency}`);
  console.log("");

  const tStart = Date.now();
  let done = 0;
  const results = await processWithLimit(entries, concurrency, async (e) => {
    const r = await judgeOne(e);
    done++;
    const status = r.judgeError ? "❌" : "✅";
    const overall = r.scores
      ? Math.round(
          (r.scores.interpelacion +
            r.scores.validacion +
            r.scores.concrecion +
            r.scores.brevedad +
            r.scores.ausencia_jerga) /
            5,
        )
      : "-";
    process.stdout.write(`  ${status} [${done}/${entries.length}] q${r.question_id} score≈${overall} (${r.judgeLatencyMs}ms)\n`);
    return r;
  });
  const totalMs = Date.now() - tStart;

  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const outDir = join(__dirname, "results");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `judged_${basename(input).replace(/\.jsonl$/, "")}_${stamp}.jsonl`);
  writeFileSync(outPath, results.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const summary = summarize(results);
  console.log("");
  console.log("Resumen:");
  if (summary) {
    console.log(`  scored:      ${summary.n}`);
    console.log(`  errores:     ${summary.errors}`);
    console.log(`  promedios (1-5):`);
    for (const [k, v] of Object.entries(summary.avg)) {
      console.log(`    ${k.padEnd(20)} ${v}`);
    }
    console.log(`  OVERALL:     ${summary.overall} / 5`);
  } else {
    console.log("  (sin scored entries)");
  }
  console.log(`  total:       ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`  output:      ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
