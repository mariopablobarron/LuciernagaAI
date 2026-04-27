import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { logError, logInfo } from "@/lib/logger";

// Same default as scripts/db-backup-daily.sh so a single Coolify volume
// (mapped to /app/backups/db) covers both the bash dump and this fallback.
const DEFAULT_BACKUP_DIR = "./backups/db";
const DEFAULT_RETENTION_DAYS = 14;

export type PersistResult =
  | { ok: true; path: string; sizeBytes: number }
  | { ok: false; error: string };

function resolveBackupDir(): string {
  const raw = process.env.BACKUP_DIR?.trim();
  return path.resolve(raw && raw.length > 0 ? raw : DEFAULT_BACKUP_DIR);
}

export async function persistBackupToDisk(
  data: Buffer,
  filename: string,
): Promise<PersistResult> {
  const dir = resolveBackupDir();
  const fullPath = path.join(dir, filename);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, data);
    logInfo("BACKUP", "backup_persisted_to_disk", {
      path: fullPath,
      sizeBytes: data.length,
    });
    return { ok: true, path: fullPath, sizeBytes: data.length };
  } catch (err) {
    logError("BACKUP", err, { stage: "persist_to_disk", dir, filename });
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function pruneOldBackups(): Promise<void> {
  const dir = resolveBackupDir();
  const raw = process.env.BACKUP_RETENTION_DAYS?.trim();
  const parsed = raw ? Number(raw) : DEFAULT_RETENTION_DAYS;
  const retentionDays =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;

  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    logError("BACKUP", err, { stage: "prune_readdir", dir });
    return;
  }

  for (const name of entries) {
    if (!name.endsWith(".sql.gz")) continue;
    const filePath = path.join(dir, name);
    try {
      const s = await stat(filePath);
      if (s.isFile() && s.mtimeMs < cutoffMs) {
        await unlink(filePath);
        logInfo("BACKUP", "backup_pruned", { path: filePath });
      }
    } catch (err) {
      logError("BACKUP", err, { stage: "prune_unlink", path: filePath });
    }
  }
}
