/**
 * Validación estática del dump SQL generado por /api/admin/backup.
 *
 * NO ejecuta el SQL contra una DB — solo lo lee como texto y comprueba que
 * tiene forma sana. Útil como red de seguridad rápida (detecta dumps vacíos,
 * truncados, o sin INSERTs aunque haya tablas).
 *
 * El restore REAL contra una DB sandbox vive en backup-restore-test.ts.
 */

import { gunzipSync } from "node:zlib";

export type ValidationResult = {
  ok: boolean;
  sqlBytes: number;
  /** Líneas que empiezan con "-- Backup:" */
  hasHeader: boolean;
  /** Número de CREATE TABLE encontrados */
  createTableCount: number;
  /** Número de INSERT INTO encontrados */
  insertCount: number;
  /** Tablas que aparecen en CREATE TABLE statements */
  tablesDetected: string[];
  /** Lista de razones por las que ok=false (si aplica) */
  reasons: string[];
};

const MIN_BYTES = 100;
const MIN_TABLES = 5;
const MIN_INSERTS = 1;

const CREATE_TABLE_RE = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+"?([a-zA-Z0-9_]+)"?/gi;
const INSERT_RE = /INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?/gi;

/**
 * Acepta tanto un buffer gzipped (.sql.gz) como SQL plano.
 */
export function validateBackupDump(input: Buffer | string): ValidationResult {
  let sql: string;

  if (typeof input === "string") {
    sql = input;
  } else {
    // Detectar si está comprimido por magic bytes 0x1f 0x8b
    const isGzip = input.length >= 2 && input[0] === 0x1f && input[1] === 0x8b;
    if (isGzip) {
      try {
        sql = gunzipSync(input).toString("utf-8");
      } catch (err) {
        return {
          ok: false,
          sqlBytes: 0,
          hasHeader: false,
          createTableCount: 0,
          insertCount: 0,
          tablesDetected: [],
          reasons: [`gunzip failed: ${err instanceof Error ? err.message : String(err)}`],
        };
      }
    } else {
      sql = input.toString("utf-8");
    }
  }

  const sqlBytes = Buffer.byteLength(sql, "utf-8");
  const hasHeader = /^-- Backup:/m.test(sql);
  const tablesDetected: string[] = [];
  let createTableCount = 0;
  let insertCount = 0;

  const seen = new Set<string>();
  for (const m of sql.matchAll(CREATE_TABLE_RE)) {
    createTableCount++;
    const name = m[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      tablesDetected.push(name);
    }
  }
  for (const _m of sql.matchAll(INSERT_RE)) {
    insertCount++;
  }

  const reasons: string[] = [];
  if (sqlBytes < MIN_BYTES) reasons.push(`sql too small (${sqlBytes} bytes < ${MIN_BYTES})`);
  if (!hasHeader) reasons.push("missing '-- Backup:' header");
  if (createTableCount < MIN_TABLES) {
    reasons.push(`only ${createTableCount} CREATE TABLE found (min ${MIN_TABLES})`);
  }
  if (insertCount < MIN_INSERTS) {
    reasons.push(`only ${insertCount} INSERT INTO found (min ${MIN_INSERTS})`);
  }

  return {
    ok: reasons.length === 0,
    sqlBytes,
    hasHeader,
    createTableCount,
    insertCount,
    tablesDetected,
    reasons,
  };
}
