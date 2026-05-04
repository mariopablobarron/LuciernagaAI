import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Persistencia local de backups SQL como fallback cuando Telegram rechaza
 * (por límite 49 MB).
 *
 * Lee `BACKUP_DIR` de env (default `./backups`). Coherente con el path que
 * ya usa `scripts/db-backup-daily.sh`.
 *
 * IMPORTANTE: para que el backup sobreviva al recreo del contenedor, el path
 * debe ser un VOLUMEN DOCKER MAPEADO. Si solo escribe dentro del rootfs del
 * contenedor, se pierde la próxima vez que Coolify recrea la imagen.
 *
 * En el compose de la app (`/docker/luciernaga-ai-traefik/docker-compose.yml`)
 * añade:
 *   volumes:
 *     - ./backups:/app/backups
 *   environment:
 *     BACKUP_DIR: /app/backups
 */

export type PersistResult =
  | { ok: true; absolutePath: string; sizeBytes: number }
  | { ok: false; error: string; reason?: "mkdir_failed" | "write_failed" | "no_dir" };

export const DEFAULT_BACKUP_DIR = "./backups";

export async function persistBackupLocally(
  buffer: Buffer | Uint8Array,
  filename: string,
  options: { dir?: string } = {},
): Promise<PersistResult> {
  const dir = options.dir ?? process.env.BACKUP_DIR?.trim() ?? DEFAULT_BACKUP_DIR;
  if (!dir) {
    return { ok: false, error: "No backup directory configured", reason: "no_dir" };
  }

  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    return {
      ok: false,
      error: `mkdir failed: ${err instanceof Error ? err.message : String(err)}`,
      reason: "mkdir_failed",
    };
  }

  const safeName = sanitizeFilename(filename);
  const absolutePath = path.resolve(dir, safeName);

  try {
    await fs.writeFile(absolutePath, buffer);
  } catch (err) {
    return {
      ok: false,
      error: `write failed: ${err instanceof Error ? err.message : String(err)}`,
      reason: "write_failed",
    };
  }

  return { ok: true, absolutePath, sizeBytes: buffer.length };
}

/**
 * Reemplaza caracteres potencialmente peligrosos en filename. Bloquea
 * traversal (../ y /) y deja solo alphanum, guiones, puntos y subrayados.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}
