/**
 * Counselling Bench eval — pasa 100 queries reales de counseling
 * (dataset: ChatPsychiatrist/EmoCareAI, Apache-2.0) por el coach prompt
 * actual y guarda outputs en eval/results/<timestamp>.jsonl.
 *
 * Esto NO ejecuta el pipeline completo (intercept, flow, persistence).
 * Solo evalúa el CONTENIDO de las respuestas del modelo dado el prompt
 * del coach. Para regression del pipeline, usar processMessage.golden.test.ts.
 *
 * Uso:
 *   OPENROUTER_API_KEY=... npx tsx eval/run-counselling-bench.ts
 *   OPENROUTER_API_KEY=... npx tsx eval/run-counselling-bench.ts --limit 10
 *   OPENROUTER_API_KEY=... npx tsx eval/run-counselling-bench.ts --concurrency 3
 *
 * Output:
 *   eval/results/counselling_bench_<YYYY-MM-DD-HHmm>.jsonl
 *   { question_id, query, response, fallback, latencyMs, errorType? }
 *
 * Coste estimado (100 queries con el modelo configurado en OPENROUTER_MODEL):
 *   ~$0.20-1.00 según el modelo. Consultar /admin/llm-usage tras correr.
 *
 * Atribución: dataset original https://github.com/EmoCareAI/ChatPsychiatrist
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateAIResponse } from "@/services/ai";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";

type BenchEntry = {
  question_id: number;
  turns: string[];
  category: string;
};

type ResultEntry = {
  question_id: number;
  category: string;
  query: string;
  response: string;
  fallback: boolean;
  errorType?: string;
  errorMessage?: string;
  latencyMs: number;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]): { limit: number; concurrency: number } {
  let limit = Number.POSITIVE_INFINITY;
  let concurrency = 2;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) limit = Math.max(1, Number(argv[i + 1]));
    if (argv[i] === "--concurrency" && argv[i + 1]) concurrency = Math.max(1, Number(argv[i + 1]));
  }
  return { limit, concurrency };
}

function loadBench(path: string): BenchEntry[] {
  const raw = readFileSync(path, "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as BenchEntry);
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

async function evaluateOne(entry: BenchEntry): Promise<ResultEntry> {
  const query = entry.turns[0] ?? "";
  const t0 = Date.now();
  try {
    const result = await generateAIResponse(
      query,
      "neutral",
      DEFAULT_EMOTIONAL_PROFILE,
      {
        // Context mínimo: sin goal, sin flow, sin onboarding.
        // Importante: marcamos como neutral para que el coach use lenguaje
        // sin género (cubre el caso por defecto de un usuario nuevo).
        userGender: "neutral",
      },
      [],
      { userId: "eval-counselling-bench", source: "eval" },
    );
    return {
      question_id: entry.question_id,
      category: entry.category,
      query,
      response: result.response,
      fallback: result.fallback,
      errorType: result.errorType,
      errorMessage: result.errorMessage,
      latencyMs: Date.now() - t0,
    };
  } catch (error) {
    return {
      question_id: entry.question_id,
      category: entry.category,
      query,
      response: "",
      fallback: true,
      errorType: "exception",
      errorMessage: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - t0,
    };
  }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error("ERROR: OPENROUTER_API_KEY no configurada. Exporta la key antes de ejecutar.");
    process.exit(1);
  }

  const { limit, concurrency } = parseArgs(process.argv.slice(2));
  const benchPath = join(__dirname, "data", "counselling_bench_en.jsonl");
  if (!existsSync(benchPath)) {
    console.error(`ERROR: dataset no encontrado: ${benchPath}`);
    console.error("Re-descargar con: curl -L https://raw.githubusercontent.com/EmoCareAI/ChatPsychiatrist/master/fastchat/llm_judge/data/counselling_bench/Sanitised_CounsQs_subset.jsonl -o eval/data/counselling_bench_en.jsonl");
    process.exit(1);
  }

  const allEntries = loadBench(benchPath);
  const entries = allEntries.slice(0, Math.min(limit, allEntries.length));

  console.log(`Counselling Bench eval`);
  console.log(`  total queries: ${entries.length}/${allEntries.length}`);
  console.log(`  concurrency: ${concurrency}`);
  console.log(`  modelo: ${process.env.OPENROUTER_MODEL ?? "(default del código)"}`);
  console.log("");

  const tStart = Date.now();
  let done = 0;
  const results = await processWithLimit(entries, concurrency, async (entry) => {
    const r = await evaluateOne(entry);
    done++;
    const status = r.fallback ? "❌" : "✅";
    process.stdout.write(`  ${status} [${done}/${entries.length}] q${r.question_id} (${r.latencyMs}ms)\n`);
    return r;
  });
  const totalMs = Date.now() - tStart;

  const ok = results.filter((r) => !r.fallback).length;
  const failed = results.length - ok;
  const avgLat = Math.round(
    results.filter((r) => !r.fallback).reduce((s, r) => s + r.latencyMs, 0) / Math.max(1, ok),
  );

  // Persistir
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const outDir = join(__dirname, "results");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `counselling_bench_${stamp}.jsonl`);
  writeFileSync(outPath, results.map((r) => JSON.stringify(r)).join("\n") + "\n");

  console.log("");
  console.log(`Resumen:`);
  console.log(`  ok:        ${ok}`);
  console.log(`  fallback:  ${failed}`);
  console.log(`  latencia ø: ${avgLat}ms`);
  console.log(`  total:     ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`  output:    ${outPath}`);
  console.log("");
  console.log("Próximos pasos:");
  console.log("  - Revisar manualmente algunas respuestas en el .jsonl.");
  console.log("  - Verificar tono interpelativo (preguntas > consejos directos).");
  console.log("  - Para diff entre runs: jq -s '.[].response' eval/results/<a>.jsonl > a.txt; diff a.txt b.txt");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
