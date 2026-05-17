#!/usr/bin/env node
/**
 * Verifica integridad de messages/*.json SIN llamar al LLM.
 *
 * Tres comprobaciones independientes (activables por flag):
 *
 *  --mode=parity  (default)
 *     Toda key presente en es.json debe existir también en en/pt/fr.json
 *     con valor non-empty. Falla con código 1 si hay drift. Para CI.
 *
 *  --mode=unused
 *     Lista keys de es.json que no están referenciadas en ningún archivo
 *     de src/. Heurística (no AST): busca `useTranslations("ns")` y
 *     `t("key")` y reconstruye el path completo. Falsos positivos posibles
 *     en keys construidas dinámicamente (`t(\`state.${id}.label\`)`) —
 *     por eso por defecto sólo es WARNING, no fail.
 *
 *  --mode=all
 *     Corre las dos. parity como hard fail, unused como warning.
 *
 * Argumentos extras:
 *   --json        salida JSON
 *   --quiet       sólo imprime errores; útil en CI cuando hay éxito
 *   --strict-unused   convierte unused en hard fail (uso manual, no CI)
 *   --strict-orphans  convierte huérfanas (en destino, no en es.json) en fail
 *
 * Códigos de salida:
 *   0  todo OK
 *   1  parity fallida (keys faltantes en destino)
 *   2  --strict-unused activo y hay keys no usadas
 *   3  --strict-orphans activo y hay huérfanas
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MESSAGES_DIR = path.join(ROOT, "messages");
const SOURCE_LOCALE = "es";
const TARGET_LOCALES = ["en", "pt", "fr"];

// ─── Args ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const modeArg = argv.find((a) => a.startsWith("--mode="));
const MODE = modeArg ? modeArg.replace("--mode=", "") : "parity";
const JSON_OUT = argv.includes("--json");
const QUIET = argv.includes("--quiet");
const STRICT_UNUSED = argv.includes("--strict-unused");
const STRICT_ORPHANS = argv.includes("--strict-orphans");

if (!["parity", "unused", "all"].includes(MODE)) {
  console.error(`Modo inválido: ${MODE}. Usa parity | unused | all`);
  process.exit(64);
}

// ─── Helpers de árbol ────────────────────────────────────────────────────────

function flatten(obj, prefix = "") {
  const out = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.set(fullPath, value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [p, v] of flatten(value, fullPath)) out.set(p, v);
    }
  }
  return out;
}

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ─── Mode: parity ────────────────────────────────────────────────────────────

function checkParity() {
  const srcPath = path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);
  const src = flatten(loadJSON(srcPath));

  const result = {
    sourceKeys: src.size,
    missingByLocale: {},      // locale → [{ path, source }]
    orphansByLocale: {},      // locale → [path]  (en destino pero no en es)
    emptyByLocale: {},        // locale → [path]  (existe pero valor vacío)
  };

  for (const locale of TARGET_LOCALES) {
    const dstPath = path.join(MESSAGES_DIR, `${locale}.json`);
    if (!fs.existsSync(dstPath)) {
      result.missingByLocale[locale] = [...src.entries()].map(([p, s]) => ({ path: p, source: s }));
      result.orphansByLocale[locale] = [];
      result.emptyByLocale[locale] = [];
      continue;
    }
    const dst = flatten(loadJSON(dstPath));
    const missing = [];
    const empty = [];
    for (const [p, source] of src) {
      const dstValue = dst.get(p);
      if (dstValue === undefined) {
        missing.push({ path: p, source });
      } else if (typeof dstValue === "string" && !dstValue.trim()) {
        empty.push(p);
      }
    }
    const orphans = [];
    for (const p of dst.keys()) {
      if (!src.has(p)) orphans.push(p);
    }
    result.missingByLocale[locale] = missing;
    result.orphansByLocale[locale] = orphans;
    result.emptyByLocale[locale] = empty;
  }

  return result;
}

// ─── Mode: unused ────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", ".turbo", ".cache", ".git"]);

function* walkCode(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkCode(full);
    else if (entry.isFile() && /\.(tsx?|jsx?|mjs)$/.test(entry.name)) yield full;
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extrae keys usadas en un archivo TS/TSX.
 *
 * Detecta:
 *  - useTranslations("namespace") / getTranslations("namespace") / useTranslations()
 *  - Llamadas t("key"), t.rich("key", ...), t.markup("key", ...), t.raw("key")
 *  - Re-bindings: const tFoo = useTranslations("foo"); tFoo("bar")  → "foo.bar"
 *  - Template literals: t(`honesty${n}Strong`) → patrón regex que matchea
 *    cualquier key con la forma "honesty.+Strong" dentro del namespace.
 *  - Variables: t(item.id) / t(link.key) / t(variable) — registra el
 *    namespace como "fully dynamic" (cubre todas las keys directas del ns).
 *    Detectado por incidente 2026-05-17 cuando t(link.id) en Header.tsx
 *    invocaba nav.pricing/faq/test y el detector las marcó como huérfanas.
 *
 * Limitaciones:
 *  - No AST: nesting de useTranslations en bloques con scope distinto no se
 *    distingue. Para los patrones reales del repo basta el último binding.
 */
function extractUsedKeys(source) {
  const used = new Set();
  /** @type {RegExp[]} */
  const dynamicPatterns = [];

  // Recolectar todos los bindings de useTranslations/getTranslations.
  // Si la misma variable (típicamente `t`) se reasigna a un namespace
  // distinto en otro componente del mismo archivo, acumulamos TODOS los
  // namespaces — no sabemos cuál usa cada llamada sin AST/scope analysis.
  // Incidente 2026-05-17: HomeWorkspace.tsx tiene
  //   const t = useTranslations("workspace.continuity");  // línea 106
  //   const t = useTranslations("workspace");              // línea 152
  // El detector veía workspace.continuity.descNoSession como huérfana
  // porque el último binding pisaba al anterior.
  const bindings = new Map(); // varName → Set<namespace>

  const bindingRegex =
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\s*\(\s*(?:["']([^"']*)["'])?\s*\)/g;
  let bm;
  while ((bm = bindingRegex.exec(source)) !== null) {
    const varName = bm[1];
    const ns = bm[2] ?? "";
    if (!bindings.has(varName)) bindings.set(varName, new Set());
    bindings.get(varName).add(ns);
  }

  // El default `t = ""` solo aplica si NO hay binding explícito de `t`.
  // De otro modo el namespace vacío matchearía cualquier key → 0 huérfanas.
  if (!bindings.has("t")) {
    bindings.set("t", new Set([""]));
  }

  for (const [varName, namespaces] of bindings) {
    const escapedVar = escapeRegex(varName);

    // Llamadas estáticas: tVar("key") y variantes (.rich, .markup, .raw).
    const callRegex = new RegExp(
      `\\b${escapedVar}(?:\\.(?:rich|markup|raw))?\\s*\\(\\s*["']([^"'\`]+)["']`,
      "g",
    );
    let cm;
    while ((cm = callRegex.exec(source)) !== null) {
      const key = cm[1];
      // Si la variable tiene múltiples namespaces, la key puede pertenecer
      // a cualquiera. Marcamos todas las posibilidades como usadas.
      for (const namespace of namespaces) {
        const full = namespace ? `${namespace}.${key}` : key;
        used.add(full);
      }
    }

    // Template literals dinámicos: tVar(`tpl${expr}rest`).
    const tmplRegex = new RegExp(
      `\\b${escapedVar}(?:\\.(?:rich|markup|raw))?\\s*\\(\\s*\`([^\`]+)\``,
      "g",
    );
    let dm;
    while ((dm = tmplRegex.exec(source)) !== null) {
      const tmpl = dm[1];
      if (!tmpl.includes("${")) continue;
      const parts = tmpl.split(/\$\{[^}]*\}/);
      const escapedParts = parts.map(escapeRegex);
      const body = escapedParts.join("[\\w.-]+?");
      for (const namespace of namespaces) {
        const fullPattern = namespace
          ? `^${escapeRegex(namespace)}\\.${body}$`
          : `^${body}$`;
        try {
          dynamicPatterns.push(new RegExp(fullPattern));
        } catch { /* pattern inválido */ }
      }
    }

    // Variables como argumento: tVar(item.id) / tVar(link.key) / tVar(variable).
    // Marca TODO el namespace como dinámico (cubre cualquier key directa).
    const variableArgRegex = new RegExp(
      `\\b${escapedVar}(?:\\.(?:rich|markup|raw))?\\s*\\(\\s*([a-zA-Z_$][\\w$.]*)\\s*[,)]`,
      "g",
    );
    let vm;
    while ((vm = variableArgRegex.exec(source)) !== null) {
      const argName = vm[1];
      if (["true", "false", "null", "undefined", "void"].includes(argName)) continue;
      for (const namespace of namespaces) {
        const fullPattern = namespace
          ? `^${escapeRegex(namespace)}\\.[\\w-]+$`
          : `^[\\w.-]+$`;
        try {
          dynamicPatterns.push(new RegExp(fullPattern));
        } catch { /* ignorar */ }
      }
    }
  }

  return { used, dynamicPatterns };
}

function checkUnused(srcKeys) {
  const used = new Set();
  /** @type {RegExp[]} */
  const dynamicPatterns = [];

  // Escaneamos src/ (componentes y rutas) — messages/ no se incluye porque
  // tener una key en es.json no la "usa", obviamente.
  for (const file of walkCode(path.join(ROOT, "src"))) {
    const source = fs.readFileSync(file, "utf8");
    const { used: u, dynamicPatterns: dp } = extractUsedKeys(source);
    for (const k of u) used.add(k);
    for (const re of dp) dynamicPatterns.push(re);
  }

  const isPotentiallyUsed = (key) => {
    if (used.has(key)) return true;
    for (const re of dynamicPatterns) {
      if (re.test(key)) return true;
    }
    return false;
  };

  const unused = [];
  for (const key of srcKeys) {
    if (!isPotentiallyUsed(key)) unused.push(key);
  }
  return { unused, usedCount: used.size, dynamicPatternCount: dynamicPatterns.length };
}

// ─── Output ──────────────────────────────────────────────────────────────────

function printParity(report) {
  const totalMissing = Object.values(report.missingByLocale).reduce((a, l) => a + l.length, 0);
  const totalOrphans = Object.values(report.orphansByLocale).reduce((a, l) => a + l.length, 0);
  const totalEmpty = Object.values(report.emptyByLocale).reduce((a, l) => a + l.length, 0);

  if (totalMissing === 0 && totalOrphans === 0 && totalEmpty === 0) {
    if (!QUIET) {
      console.log(`✓ i18n parity OK — ${report.sourceKeys} keys en es.json, todas presentes en ${TARGET_LOCALES.join("/")}`);
    }
    return;
  }

  console.log(`\n═════ i18n parity ═════════════════════════════════════════════`);
  console.log(`Fuente: es.json (${report.sourceKeys} keys)`);
  console.log("");

  for (const locale of TARGET_LOCALES) {
    const missing = report.missingByLocale[locale];
    const orphans = report.orphansByLocale[locale];
    const empty = report.emptyByLocale[locale];
    const status = missing.length === 0 && empty.length === 0 ? "✓" : "✗";
    console.log(`  ${status} ${locale}: ${missing.length} faltantes · ${empty.length} vacías · ${orphans.length} huérfanas`);
  }

  // Si hay faltantes, listar primeras N para guía rápida.
  for (const locale of TARGET_LOCALES) {
    const missing = report.missingByLocale[locale];
    if (missing.length === 0) continue;
    console.log(`\n  ── ${locale}: faltantes (mostrando hasta 10) ──`);
    for (const { path: p, source } of missing.slice(0, 10)) {
      const preview = source.length > 60 ? `${source.slice(0, 57)}…` : source;
      console.log(`     ${p}: "${preview}"`);
    }
    if (missing.length > 10) console.log(`     … +${missing.length - 10} más`);
  }

  // Huérfanas: listar como warning.
  if (totalOrphans > 0) {
    const uniqueOrphans = new Set();
    for (const list of Object.values(report.orphansByLocale)) {
      for (const o of list) uniqueOrphans.add(o);
    }
    console.log(`\n  ⚠ ${uniqueOrphans.size} huérfanas únicas en destino (no en es.json):`);
    for (const o of [...uniqueOrphans].slice(0, 15)) console.log(`     · ${o}`);
    if (uniqueOrphans.size > 15) console.log(`     … +${uniqueOrphans.size - 15} más`);
  }

  if (totalMissing > 0 || totalEmpty > 0) {
    console.log(`\n  Fix: ejecuta \`pnpm i18n:sync\` (requiere OPENROUTER_API_KEY con saldo).`);
  }
  console.log("");
}

function printUnused(unusedReport, srcKeysSize) {
  const { unused, usedCount, dynamicPatternCount } = unusedReport;
  if (unused.length === 0) {
    if (!QUIET) {
      console.log(`✓ Sin keys huérfanas detectadas (${srcKeysSize} en es.json, ${usedCount} referenciadas directamente, ${dynamicPatternCount} patrones dinámicos cubren el resto)`);
    }
    return;
  }

  console.log(`\n═════ Keys posiblemente no usadas ═══════════════════════════`);
  console.log(`  ${unused.length} de ${srcKeysSize} keys en es.json no aparecen referenciadas en src/.`);
  console.log(`  (${usedCount} keys con uso directo · ${dynamicPatternCount} patrones dinámicos protegen el resto)`);
  console.log("");
  console.log(`  ⚠ Heurística regex, no AST. Revisa antes de borrar:`);
  console.log(`     - keys construidas con t(\`prefix.\${var}\`) protegidas por prefijo dinámico.`);
  console.log(`     - keys usadas sólo en server actions o tests pueden no detectarse.`);
  console.log("");

  // Agrupar por raíz para legibilidad.
  const byRoot = new Map();
  for (const k of unused) {
    const root = k.split(".")[0];
    const list = byRoot.get(root) ?? [];
    list.push(k);
    byRoot.set(root, list);
  }
  const sorted = [...byRoot.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [root, keys] of sorted) {
    console.log(`  ${root} (${keys.length})`);
    for (const k of keys.slice(0, 8)) console.log(`     · ${k}`);
    if (keys.length > 8) console.log(`     … +${keys.length - 8} más`);
  }
  console.log("");
}

// ─── Main ────────────────────────────────────────────────────────────────────

let exitCode = 0;

const parityReport = (MODE === "parity" || MODE === "all") ? checkParity() : null;
if (parityReport) {
  if (JSON_OUT) {
    // Lo dejamos para el dump conjunto al final
  } else {
    printParity(parityReport);
  }
  const totalMissing = Object.values(parityReport.missingByLocale).reduce((a, l) => a + l.length, 0);
  const totalEmpty = Object.values(parityReport.emptyByLocale).reduce((a, l) => a + l.length, 0);
  const totalOrphans = Object.values(parityReport.orphansByLocale).reduce((a, l) => a + l.length, 0);
  if (totalMissing > 0 || totalEmpty > 0) exitCode = 1;
  if (STRICT_ORPHANS && totalOrphans > 0 && exitCode === 0) exitCode = 3;
}

let unusedReport = null;
let srcKeysSize = 0;
if (MODE === "unused" || MODE === "all") {
  const srcPath = path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);
  const srcKeys = flatten(loadJSON(srcPath));
  srcKeysSize = srcKeys.size;
  unusedReport = checkUnused(srcKeys.keys());
  if (!JSON_OUT) printUnused(unusedReport, srcKeysSize);
  if (STRICT_UNUSED && unusedReport.unused.length > 0 && exitCode === 0) exitCode = 2;
}

if (JSON_OUT) {
  const out = {
    mode: MODE,
    exitCode,
    parity: parityReport,
    unused: unusedReport ? { ...unusedReport, sourceKeys: srcKeysSize } : null,
  };
  console.log(JSON.stringify(out, null, 2));
}

process.exit(exitCode);
