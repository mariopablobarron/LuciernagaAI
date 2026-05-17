#!/usr/bin/env node
/**
 * Sincroniza messages/{en,pt,fr}.json con messages/es.json.
 *
 * Caso de uso: editas es.json (añades una key, renombras, modificas valor),
 * ejecutas `pnpm i18n:sync` y las traducciones quedan al día sin
 * pedirme que las haga a mano.
 *
 * Reglas:
 *  - es.json es la FUENTE DE VERDAD para el conjunto de keys y su orden.
 *  - Para cada key que existe en es.json:
 *      - Si existe en el destino con valor non-empty → se conserva tal cual
 *        (no sobrescribe ediciones manuales de Mario).
 *      - Si NO existe o tiene valor vacío → se traduce con LLM (Haiku).
 *  - Keys huérfanas (en destino pero no en es) → se LISTAN pero NO se borran
 *    (evita pérdidas accidentales; Mario decide si las limpia).
 *  - Orden de keys: el destino se reescribe siguiendo el orden de es.json.
 *
 * Voz de marca por idioma (idéntica a la del blog-translator y email-i18n):
 *  - PT-PT estricto: tu + enclisis, sin "você", deteção/projeto/ficheiro.
 *  - FR-FR: tutoiement, sin vouvoiement.
 *  - EN-US: "you" directo.
 *  - Brand names: Three Billion Heartbeats / Três Mil Milhões de Batidas
 *    / Trois Milliards de Battements.
 *
 * Coste: ~$0.001–0.005 por sync típico (15-30 keys nuevas), batch único.
 *
 * Argumentos:
 *   --dry-run         No escribe nada, solo imprime el plan.
 *   --locale=en,fr    Solo procesa estos idiomas (default: en,pt,fr).
 *   --force-key=path  Re-traduce esta key específica aunque ya exista.
 *                     Repetir para varias: --force-key=nav.chat --force-key=hero.title
 *
 * Entorno:
 *   OPENROUTER_API_KEY    requerido
 *   OPENROUTER_MODEL      opcional (default: anthropic/claude-haiku-4-5)
 */

import fs from "node:fs";
import path from "node:path";

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const MESSAGES_DIR = path.join(ROOT, "messages");
const SOURCE_LOCALE = "es";
const TARGET_LOCALES_ALL = ["en", "pt", "fr"];
const MODEL = process.env.OPENROUTER_MODEL?.trim() || "anthropic/claude-haiku-4-5";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;
const BATCH_MAX_KEYS = 25; // chunks pequeños — reduce coste por llamada y evita topes de crédito

// ─── Args ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const localeArg = argv.find((a) => a.startsWith("--locale="));
const TARGETS = localeArg
  ? localeArg.replace("--locale=", "").split(",").filter((l) => TARGET_LOCALES_ALL.includes(l))
  : TARGET_LOCALES_ALL;
const FORCE_KEYS = new Set(
  argv.filter((a) => a.startsWith("--force-key=")).map((a) => a.replace("--force-key=", "")),
);

// ─── Helpers de árbol ────────────────────────────────────────────────────────

/**
 * Aplana un objeto en un Map<path, value> donde path es "a.b.c". Solo
 * incluye leafs (strings). Ignora arrays (no se usan en messages/*.json).
 */
function flatten(obj, prefix = "") {
  const out = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.set(path, value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [p, v] of flatten(value, path)) {
        out.set(p, v);
      }
    }
    // Arrays se ignoran — no aparecen en los messages.
  }
  return out;
}

/**
 * Reconstruye el árbol del destino siguiendo el ORDEN de keys del fuente.
 *  - Para cada key del fuente:
 *     - Si es un objeto → recurse.
 *     - Si es string → usa el valor del destino existente; si no existe (o
 *       está vacío), marca como pendiente de traducir.
 *  - Las keys huérfanas del destino (no presentes en fuente) se PRESERVAN
 *    al final de su parent y se listan en `orphans` para que el caller las
 *    muestre. No se borran automáticamente — evita pérdidas accidentales
 *    si Mario está refactorizando y luego revierte.
 */
function buildAligned(srcNode, dstNode, currentPath = "", missing = [], orphans = []) {
  const result = {};
  const dstObj = (dstNode && typeof dstNode === "object" && !Array.isArray(dstNode)) ? dstNode : {};

  for (const [key, srcValue] of Object.entries(srcNode)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    const dstValue = dstObj[key];

    if (typeof srcValue === "string") {
      const existing = typeof dstValue === "string" ? dstValue : "";
      const forced = FORCE_KEYS.has(fullPath);
      if (existing && !forced) {
        result[key] = existing;
      } else {
        // Placeholder; el caller lo rellenará tras llamar al LLM.
        result[key] = "__PENDING__";
        missing.push({ path: fullPath, source: srcValue, forced });
      }
    } else if (srcValue && typeof srcValue === "object" && !Array.isArray(srcValue)) {
      const subDst = dstValue && typeof dstValue === "object" && !Array.isArray(dstValue) ? dstValue : {};
      result[key] = buildAligned(srcValue, subDst, fullPath, missing, orphans);
    }
    // Si srcValue es array o número, lo ignoramos (no debería ocurrir).
  }

  // Preservar huérfanas (keys en dstObj que NO existen en srcNode) al FINAL.
  // Las listamos en `orphans` para el reporte del caller, pero NO las borramos.
  for (const [dstKey, dstValue] of Object.entries(dstObj)) {
    if (!(dstKey in srcNode)) {
      const fullPath = currentPath ? `${currentPath}.${dstKey}` : dstKey;
      orphans.push(fullPath);
      result[dstKey] = dstValue;
    }
  }

  return result;
}

/** Setea result[path] = value, creando objetos intermedios si hace falta. */
function setByPath(tree, dottedPath, value) {
  const parts = dottedPath.split(".");
  let node = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

// ─── Prompts por idioma (voz de marca) ───────────────────────────────────────

const BRAND_NAME = {
  es: "Tres Mil Millones de Latidos",
  en: "Three Billion Heartbeats",
  pt: "Três Mil Milhões de Batidas",
  fr: "Trois Milliards de Battements",
};

const GUIDELINES = {
  en: `Translate to American English. Use "you" directly (no formal "one" or passive). Voice: direct, warm but not corny. Brand: "${BRAND_NAME.en}". Keep placeholders like {name}, {count}, {n} LITERAL — never translate them.`,
  pt: `Traduz para português europeu (PT-PT), NÃO português do Brasil. Usa "tu" e ênclise sempre que aplicável. NUNCA uses "você". Vocabulário PT-PT: deteção, ação, projeto, ficheiro, ecrã, definições, palavra-passe, utilizador, telemóvel, equipa. Marca: "${BRAND_NAME.pt}". Preserva placeholders como {name}, {count}, {n} LITERAIS — nunca os traduzas.`,
  fr: `Traduis en français de France. Tutoiement systématique ("tu", "ton", "tes") — JAMAIS de vouvoiement. Voix : directe, chaleureuse mais sans sentimentalisme. Marque : "${BRAND_NAME.fr}". Garde les placeholders {name}, {count}, {n} LITTÉRAUX — ne les traduis jamais.`,
};

const SYSTEM_PROMPT = `Eres un traductor especializado de UI strings para el producto "Tres Mil Millones de Latidos".

Recibes un JSON con strings en español (cada uno identificado por una "key" como "nav.chat" o "hero.title") y los devuelves traducidos al idioma destino MANTENIENDO la misma key.

REGLAS NO NEGOCIABLES:
1. Voz de marca: directa, interpeladora, sin paja motivacional.
2. NUNCA traduzcas placeholders como {name}, {count}, {n}, {locale}. Déjalos LITERALES en la traducción.
3. NUNCA traduzcas URLs, números de teléfono, emails ni nombres propios.
4. La marca tiene equivalente oficial — usa el que indique el guideline del idioma.
5. Mantén el TONO y LONGITUD del original. Si el original es corto y seco, no lo alargues.
6. Si el string contiene HTML tags como <strong>...</strong>, <link>...</link>, <code>...</code>, <mailto>...</mailto>, <br>: mantenlos LITERALES, solo traduce el contenido dentro.
7. Si el string contiene flechas como "→" o "←", mantenlas.

DEVUELVE SOLO un JSON object con la misma estructura { "<key>": "<traducción>", ... } — sin markdown fences, sin comentarios, sin texto extra.`;

function buildUserPrompt(targetLocale, items) {
  return [
    `IDIOMA DESTINO: ${targetLocale}`,
    ``,
    `Guidelines de marca:`,
    GUIDELINES[targetLocale],
    ``,
    `Traduce estos ${items.length} strings (devuelve JSON con las mismas keys):`,
    JSON.stringify(
      Object.fromEntries(items.map(({ path, source }) => [path, source])),
      null,
      2,
    ),
  ].join("\n");
}

// ─── Llamada LLM ─────────────────────────────────────────────────────────────

async function callOpenRouter(systemPrompt, userPrompt, feature) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta OPENROUTER_API_KEY en el entorno.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": `mentor-web/${feature}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("Respuesta vacía del LLM");
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJSONLoosely(raw) {
  let candidate = raw.trim();
  const fence = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) candidate = fence[1].trim();
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first > 0 || last < candidate.length - 1) {
    candidate = candidate.slice(first, last + 1);
  }
  return JSON.parse(candidate);
}

async function translateBatch(targetLocale, items) {
  const reply = await callOpenRouter(
    SYSTEM_PROMPT,
    buildUserPrompt(targetLocale, items),
    `i18n_sync_${targetLocale}`,
  );
  const parsed = parseJSONLoosely(reply);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Respuesta no es un objeto JSON");
  }
  // Verificar que devolvió todos los paths esperados.
  const out = new Map();
  for (const { path } of items) {
    const value = parsed[path];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`LLM no devolvió traducción para "${path}"`);
    }
    out.set(path, value);
  }
  return out;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, obj) {
  // 2 spaces + newline final (consistente con prettier de project).
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function syncLocale(srcTree, targetLocale) {
  const dstPath = path.join(MESSAGES_DIR, `${targetLocale}.json`);
  if (!fs.existsSync(dstPath)) {
    console.error(`[${targetLocale}] No existe ${dstPath} — skip`);
    return { added: 0, kept: 0, orphans: [] };
  }
  const dstTree = loadJSON(dstPath);

  const missing = [];
  const orphans = [];
  const aligned = buildAligned(srcTree, dstTree, "", missing, orphans);
  const kept = Array.from(flatten(aligned).values()).filter((v) => v !== "__PENDING__").length;

  if (missing.length === 0) {
    console.log(`[${targetLocale}] ✓ Sin cambios (kept=${kept}, orphans=${orphans.length})`);
    return { added: 0, kept, orphans };
  }

  const forcedCount = missing.filter((m) => m.forced).length;
  console.log(`[${targetLocale}] ${missing.length} keys a traducir (${forcedCount} forzadas, ${missing.length - forcedCount} nuevas)`);

  if (DRY_RUN) {
    console.log(`[${targetLocale}] DRY-RUN — paths que se traducirían:`);
    for (const { path: p, source } of missing.slice(0, 20)) {
      console.log(`  ${p}: "${source.slice(0, 80)}${source.length > 80 ? "…" : ""}"`);
    }
    if (missing.length > 20) console.log(`  … +${missing.length - 20} más`);
    return { added: 0, kept, orphans };
  }

  // Traducir en batches de BATCH_MAX_KEYS.
  const translated = new Map();
  for (let i = 0; i < missing.length; i += BATCH_MAX_KEYS) {
    const chunk = missing.slice(i, i + BATCH_MAX_KEYS);
    process.stdout.write(`[${targetLocale}]   batch ${i / BATCH_MAX_KEYS + 1} (${chunk.length} strings)… `);
    const start = Date.now();
    try {
      const partial = await translateBatch(targetLocale, chunk);
      for (const [k, v] of partial) translated.set(k, v);
      process.stdout.write(`OK (${Date.now() - start}ms)\n`);
    } catch (err) {
      process.stdout.write(`FALLO\n`);
      throw err;
    }
  }

  // Inyectar las traducciones en `aligned` (sustituye los __PENDING__).
  for (const [p, value] of translated) {
    setByPath(aligned, p, value);
  }

  writeJSON(dstPath, aligned);
  console.log(`[${targetLocale}] ✓ Escrito ${dstPath} (+${translated.size} keys, ${orphans.length} huérfanas)`);
  return { added: translated.size, kept, orphans };
}

async function main() {
  const srcPath = path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);
  if (!fs.existsSync(srcPath)) {
    console.error(`No existe ${srcPath}`);
    process.exit(1);
  }
  const srcTree = loadJSON(srcPath);
  const srcKeyCount = flatten(srcTree).size;

  console.log(`\nFuente: ${srcPath} (${srcKeyCount} keys)`);
  console.log(`Targets: ${TARGETS.join(", ")}`);
  if (DRY_RUN) console.log("Modo: DRY-RUN (no escribe)");
  if (FORCE_KEYS.size > 0) console.log(`Forzar re-traducción de: ${[...FORCE_KEYS].join(", ")}`);
  console.log("");

  const summary = {};
  for (const targetLocale of TARGETS) {
    summary[targetLocale] = await syncLocale(srcTree, targetLocale);
  }

  console.log("\n─── Resumen ─────────────────────────────────────────");
  for (const [loc, s] of Object.entries(summary)) {
    console.log(`  ${loc}: +${s.added} traducidas, ${s.kept} conservadas, ${s.orphans.length} huérfanas`);
  }
  // Mostrar huérfanas (mismas en todos los locales probablemente).
  const allOrphans = new Set();
  for (const s of Object.values(summary)) {
    for (const o of s.orphans) allOrphans.add(o);
  }
  if (allOrphans.size > 0) {
    console.log(`\n⚠ Huérfanas (en destino pero no en es.json) — revisa si limpias:`);
    for (const o of [...allOrphans].slice(0, 30)) console.log(`  · ${o}`);
    if (allOrphans.size > 30) console.log(`  … +${allOrphans.size - 30} más`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
