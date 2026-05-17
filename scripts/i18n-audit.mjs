#!/usr/bin/env node
/**
 * Auditor de strings hardcoded en español dentro del frontend.
 *
 * Objetivo: identificar qué archivos .tsx/.ts del producto AÚN tienen
 * texto visible al usuario en español sin pasar por useTranslations()
 * o getTranslations(). Esto revela qué páginas y componentes quedan
 * por internacionalizar tras la sesión grande de i18n.
 *
 * NO es 100% preciso (es regex sobre texto, no AST). Está calibrado
 * para favorecer **alta precisión, posible miss**: prefiere no reportar
 * algo dudoso a inundarte de falsos positivos.
 *
 * Heurística:
 *   1. Solo escanea src/app/** y src/components/** (no lib/services/api).
 *   2. Salta archivos donde se importa useTranslations / getTranslations
 *      (asumimos que el dev ya está manejando i18n ahí; las strings
 *      sueltas son probables labels técnicos o IDs).
 *   3. Para cada archivo restante, busca:
 *      a) Texto entre etiquetas JSX: >...<
 *      b) Props string que se renderizan: title="..." placeholder="..."
 *         aria-label="..." alt="..." label="..."
 *      c) Strings entre comillas dentro de JSX expressions {"..."}
 *   4. Filtra cada string: solo cuenta si parece español natural
 *      (acentos/ñ, palabras frecuentes ES, ≥3 palabras separadas por
 *      espacio, longitud mínima).
 *   5. Excluye números, URLs, emails, CSS classnames, IDs, valores
 *      enum técnicos.
 *
 * Output:
 *   - Tabla por ruta de la app con count de hits.
 *   - Top 20 strings más comunes (revela duplicados).
 *   - Total estimado de strings por traducir.
 *
 * Argumentos:
 *   --json              salida en JSON (para consumo programático)
 *   --path=...          escanear solo este path. Acepta directorio
 *                       (src/app/app) o archivo individual
 *                       (src/components/foo.tsx). Si es archivo, el
 *                       auditor lo procesa aunque ya importe next-intl.
 *   --show-strings      imprime cada string detectado (verbose)
 *   --max-per-file=N    corta lista de strings por archivo a N (default 5)
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ─── Args ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes("--json");
const SHOW_STRINGS = argv.includes("--show-strings");
const pathArg = argv.find((a) => a.startsWith("--path="));
const SCAN_ROOT = pathArg ? path.join(ROOT, pathArg.replace("--path=", "")) : null;
const maxPerFileArg = argv.find((a) => a.startsWith("--max-per-file="));
const MAX_PER_FILE = maxPerFileArg ? Number(maxPerFileArg.replace("--max-per-file=", "")) : 5;

const DEFAULT_SCAN_DIRS = [
  path.join(ROOT, "src/app"),
  path.join(ROOT, "src/components"),
];

// SCAN_ROOT puede ser archivo o directorio. Si es archivo, lo separamos
// en SCAN_FILE para procesarlo aunque ya importe next-intl (en modo
// "audit este archivo concreto" queremos ver TODAS las strings, no
// asumir que está cubierto).
let SCAN_DIRS = DEFAULT_SCAN_DIRS;
let SCAN_FILE = null;
if (SCAN_ROOT) {
  if (!fs.existsSync(SCAN_ROOT)) {
    console.error(`Path no existe: ${SCAN_ROOT}`);
    process.exit(64);
  }
  const stat = fs.statSync(SCAN_ROOT);
  if (stat.isFile()) {
    SCAN_FILE = SCAN_ROOT;
    SCAN_DIRS = [];
  } else if (stat.isDirectory()) {
    SCAN_DIRS = [SCAN_ROOT];
  } else {
    console.error(`Path no es archivo ni directorio: ${SCAN_ROOT}`);
    process.exit(64);
  }
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

// Indicadores fuertes de español: acentos/ñ o palabras frecuentes.
const ES_HINT_REGEX = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
const ES_COMMON_WORDS = new Set([
  // artículos
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  // preposiciones
  "de", "del", "en", "con", "por", "para", "sin", "sobre", "entre", "hacia",
  // pronombres
  "yo", "tú", "tu", "él", "ella", "nosotros", "vosotros", "ellos", "ellas",
  "me", "te", "se", "nos", "os", "le", "les", "mi", "tu", "su",
  // verbos comunes
  "es", "son", "está", "están", "fue", "será", "hay", "tienes", "tienes",
  "quiero", "quieres", "puedes", "necesitas", "vas", "haz", "haces",
  // conectores
  "y", "o", "pero", "porque", "cuando", "donde", "como", "si", "que",
  // adjetivos comunes
  "bueno", "malo", "nuevo", "tu", "mi", "este", "esta", "estos", "estas",
]);

// Falsos positivos típicos: nombres de archivo, técnicos, etc.
const TECHNICAL_SHAPES = [
  /^[a-z][a-zA-Z0-9_-]*$/, // camelCase / kebab-case ids
  /^[A-Z_][A-Z_0-9]*$/,    // CONSTANTES
  /^\d+(\.\d+)?(px|rem|em|%|vh|vw|s|ms)?$/, // medidas CSS
  /^#[0-9a-fA-F]{3,8}$/,    // colors
  /^\/[a-z0-9-_/[\]]+$/i,   // rutas
  /^https?:\/\//,           // URLs
  /^mailto:/,
  /\.[a-z]{2,5}$/i,         // extensiones
  /@\w+/,                   // emails / handles
  /^bg-|^text-|^p-|^m-|^w-|^h-|^flex|^grid|^rounded/, // tailwind
];

function isTechnical(s) {
  for (const re of TECHNICAL_SHAPES) {
    if (re.test(s)) return true;
  }
  // Solo caracteres ASCII sin espacios y mayoría de chars especiales? Skip.
  if (!/\s/.test(s) && /^[A-Za-z0-9_-]+$/.test(s) && s.length < 20) return true;
  return false;
}

function looksSpanish(s) {
  const trimmed = s.trim();
  if (trimmed.length < 4) return false;
  if (isTechnical(trimmed)) return false;
  if (ES_HINT_REGEX.test(trimmed)) return true;
  // Sin acentos: pedir ≥3 palabras y al menos una palabra común ES.
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  for (const w of words) {
    if (ES_COMMON_WORDS.has(w.replace(/[.,;:!?¿¡()'"]/g, ""))) return true;
  }
  return false;
}

// ─── Extracción ──────────────────────────────────────────────────────────────

function alreadyI18nized(source) {
  return /from\s+["']next-intl["']/.test(source) ||
         /from\s+["']next-intl\/server["']/.test(source);
}

/**
 * Recorre el código y devuelve un Set de strings candidatas para auditar.
 * Patterns (muy simples — no parser AST):
 *  a) Texto entre etiquetas JSX:   >Texto literal<
 *  b) Props string user-facing:    placeholder="..." title="..." aria-label="..."
 *                                   alt="..." label="..." description="..."
 *                                   subtitle="..." heading="..."
 *  c) Strings dentro de JSX expressions: {"texto"}  o  {'texto'}
 */
function extractCandidates(source) {
  const out = [];

  // a) Texto entre etiquetas JSX. Captura todo lo que esté entre > y <
  // siempre que no empiece por { (JSX expr) o sea espacios solo.
  const jsxTextRegex = />\s*([A-ZÁÉÍÓÚÑ¿¡][^<>{}\n][^<>{}\n]*[^<>{}\s])\s*</g;
  let m;
  while ((m = jsxTextRegex.exec(source)) !== null) {
    const text = m[1].trim();
    if (text && !text.startsWith("{") && !text.startsWith("$")) out.push(text);
  }

  // b) Props user-facing
  const propsRegex =
    /\b(placeholder|title|aria-label|alt|label|description|subtitle|heading|tooltip|message)=["']([^"'\n]{4,})["']/g;
  while ((m = propsRegex.exec(source)) !== null) {
    out.push(m[2].trim());
  }

  // c) Strings dentro de JSX expressions  {"texto"} o {'texto'}
  const exprStringRegex = /\{\s*["']([A-ZÁÉÍÓÚÑ¿¡][^"'\n]{8,})["']\s*\}/g;
  while ((m = exprStringRegex.exec(source)) !== null) {
    out.push(m[1].trim());
  }

  return out;
}

// ─── Walk filesystem ─────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", ".turbo", ".cache"]);
const SKIP_FILE_PATTERNS = [/\.test\.tsx?$/, /\.spec\.tsx?$/, /\.d\.ts$/, /\.stories\.tsx?$/];

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
      if (SKIP_FILE_PATTERNS.some((re) => re.test(entry.name))) continue;
      yield full;
    }
  }
}

// ─── Categorización por ruta de la app ───────────────────────────────────────

function categorize(relPath) {
  if (relPath.startsWith("src/app/(public)")) return "public_marketing";
  if (relPath.startsWith("src/app/admin/")) return "admin";
  if (relPath.startsWith("src/app/(auth)")) return "auth";
  if (relPath.startsWith("src/app/app/")) return "app_chat";
  if (relPath.startsWith("src/app/dashboard/")) return "dashboard";
  if (relPath.startsWith("src/app/profile/") || relPath.startsWith("src/app/perfil/")) return "profile";
  if (relPath.startsWith("src/app/settings/")) return "settings";
  if (relPath.startsWith("src/app/family/")) return "family";
  if (relPath.startsWith("src/app/org/")) return "org";
  if (relPath.startsWith("src/app/journey/")) return "journey";
  if (relPath.startsWith("src/app/impulso/")) return "impulso";
  if (relPath.startsWith("src/app/proyecto/")) return "project";
  if (relPath.startsWith("src/app/menores/")) return "menores";
  if (relPath.startsWith("src/app/i/")) return "invite";
  if (relPath.startsWith("src/app/admin-clinical/")) return "clinical";
  if (relPath.startsWith("src/app/[locale]")) return "public_marketing";
  if (relPath.startsWith("src/app/")) return "app_other";
  if (relPath.startsWith("src/components/admin/")) return "components_admin";
  if (relPath.startsWith("src/components/home/")) return "components_marketing";
  if (relPath.startsWith("src/components/")) return "components_shared";
  return "other";
}

// ─── Main ────────────────────────────────────────────────────────────────────

function processFile(file, fileResults, stringCounter) {
  const source = fs.readFileSync(file, "utf8");
  const candidates = extractCandidates(source);
  const hits = [];
  for (const s of candidates) {
    if (looksSpanish(s)) {
      hits.push(s);
      stringCounter.set(s, (stringCounter.get(s) ?? 0) + 1);
    }
  }
  if (hits.length > 0) {
    const rel = path.relative(ROOT, file);
    fileResults.push({
      file: rel,
      category: categorize(rel),
      alreadyI18n: alreadyI18nized(source),
      hits,
    });
  }
}

function scan() {
  const fileResults = []; // { file, category, alreadyI18n, hits: string[] }
  const stringCounter = new Map(); // string → count

  if (SCAN_FILE) {
    // Modo archivo individual: procesa siempre, incluso si ya importa next-intl.
    processFile(SCAN_FILE, fileResults, stringCounter);
  } else {
    for (const scanDir of SCAN_DIRS) {
      for (const file of walk(scanDir)) {
        processFile(file, fileResults, stringCounter);
      }
    }
  }
  return { fileResults, stringCounter };
}

function summarize({ fileResults, stringCounter }) {
  // Agrupar por categoría.
  const byCategory = new Map();
  for (const r of fileResults) {
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  // Ordenar categorías por mayor número total de hits.
  const sortedCats = [...byCategory.entries()].sort((a, b) => {
    const sumA = a[1].reduce((acc, x) => acc + x.hits.length, 0);
    const sumB = b[1].reduce((acc, x) => acc + x.hits.length, 0);
    return sumB - sumA;
  });

  const totalFiles = fileResults.length;
  const totalHits = fileResults.reduce((acc, r) => acc + r.hits.length, 0);
  const filesAlreadyI18n = fileResults.filter((r) => r.alreadyI18n).length;

  return { sortedCats, totalFiles, totalHits, filesAlreadyI18n, stringCounter };
}

function printText(report) {
  const { sortedCats, totalFiles, totalHits, filesAlreadyI18n, stringCounter } = report;

  console.log("\n═════ AUDITORÍA i18n ═════════════════════════════════════════════");
  console.log("Archivos del frontend con strings ES sospechosos (que probablemente");
  console.log("se muestran al usuario y NO pasan por useTranslations todavía):");
  console.log("");
  console.log(`  Total archivos con hits:         ${totalFiles}`);
  console.log(`    · ya importan next-intl:       ${filesAlreadyI18n}  (i18n parcial — falta migrar strings sueltas)`);
  console.log(`    · NO importan next-intl:       ${totalFiles - filesAlreadyI18n}  (i18n 0% — todo el archivo en ES)`);
  console.log(`  Total strings detectados:        ${totalHits}`);
  console.log("");
  console.log("Nota: archivos ya 100% traducidos NO aparecen aquí (no tienen hits).");
  console.log("");

  console.log("─── Por categoría ─────────────────────────────────────────────────");
  for (const [cat, files] of sortedCats) {
    const sum = files.reduce((a, f) => a + f.hits.length, 0);
    const i18nized = files.filter((f) => f.alreadyI18n).length;
    console.log(`  ${cat.padEnd(22)} ${String(sum).padStart(4)} strings  · ${files.length} archivos (${i18nized} parcialmente i18n)`);
  }

  console.log("\n─── Top 10 archivos con más hits (sin next-intl) ──────────────────");
  const noI18n = report.sortedCats
    .flatMap(([, files]) => files.filter((f) => !f.alreadyI18n))
    .sort((a, b) => b.hits.length - a.hits.length)
    .slice(0, 10);
  for (const f of noI18n) {
    console.log(`  ${String(f.hits.length).padStart(4)}  ${f.file}`);
    if (SHOW_STRINGS) {
      for (const s of f.hits.slice(0, MAX_PER_FILE)) {
        const preview = s.length > 80 ? `${s.slice(0, 77)}…` : s;
        console.log(`       "${preview}"`);
      }
      if (f.hits.length > MAX_PER_FILE) {
        console.log(`       … +${f.hits.length - MAX_PER_FILE} más`);
      }
    }
  }

  console.log("\n─── Top 15 strings duplicadas (mismo texto en N archivos) ─────────");
  const dups = [...stringCounter.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  if (dups.length === 0) {
    console.log("  (ninguna)");
  } else {
    for (const [s, count] of dups) {
      const preview = s.length > 80 ? `${s.slice(0, 77)}…` : s;
      console.log(`  ${String(count).padStart(3)}×  "${preview}"`);
    }
  }

  console.log("\nTip: `pnpm i18n:audit --show-strings` para ver cada string detectado.");
  console.log("Tip: `pnpm i18n:audit --path=src/app/dashboard` para escanear solo una ruta.\n");
}

function printJSON(report) {
  // Salida estable para consumo programático (CI/tooling).
  const out = {
    totalFiles: report.totalFiles,
    totalHits: report.totalHits,
    filesAlreadyI18n: report.filesAlreadyI18n,
    byCategory: Object.fromEntries(
      report.sortedCats.map(([cat, files]) => [
        cat,
        {
          strings: files.reduce((a, f) => a + f.hits.length, 0),
          files: files.length,
          i18nized: files.filter((f) => f.alreadyI18n).length,
        },
      ]),
    ),
    topFiles: report.sortedCats
      .flatMap(([, files]) => files.filter((f) => !f.alreadyI18n))
      .sort((a, b) => b.hits.length - a.hits.length)
      .slice(0, 20)
      .map((f) => ({ file: f.file, hits: f.hits.length, category: f.category })),
    topDuplicates: [...report.stringCounter.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([s, count]) => ({ string: s, count })),
  };
  console.log(JSON.stringify(out, null, 2));
}

const raw = scan();
const report = summarize(raw);
if (JSON_OUT) {
  printJSON(report);
} else {
  printText(report);
}
