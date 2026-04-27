import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Dispara el backup diario de PostgreSQL ejecutando `scripts/db-backup-daily.sh`.
 *
 * Llamado por cron-job.org u otro orquestador externo. Coolify v3 no tiene
 * cron interno, así que el orquestador debe pingear este endpoint con el
 * `secret` correcto cada N horas (recomendado: una vez al día, 03:00 UTC).
 *
 * Pre-requisitos en el contenedor:
 *   - `pg_dump` disponible en el PATH (instalar postgresql-client en el
 *     Dockerfile o usar una imagen base que lo incluya).
 *   - Variable `DATABASE_URL` configurada.
 *   - Volumen montado en `/app/backups` (o donde apunte BACKUP_DIR) para que
 *     los archivos sobrevivan al reinicio del contenedor.
 *
 * Recuperación: copiar el `.sql.gz` desde el volumen y restaurar con
 *   `gunzip -c backup.sql.gz | psql "$DATABASE_URL"`
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "DATABASE_URL_MISSING" }, { status: 500 });
  }

  const startedAt = Date.now();

  try {
    const { stdout, stderr, code } = await runScript("bash", ["scripts/db-backup-daily.sh"]);
    const durationMs = Date.now() - startedAt;

    if (code !== 0) {
      logError("BACKUP", new Error(`db-backup-daily exited with code ${code}`), {
        stderr: stderr.slice(-2000),
        stdout: stdout.slice(-500),
        durationMs,
      });
      return NextResponse.json(
        { success: false, exitCode: code, durationMs, stderr: stderr.slice(-1000) },
        { status: 500 }
      );
    }

    // Última línea del script imprime "[backup] Latest link: <path>"
    const latestLine = stdout.split("\n").reverse().find((l) => l.includes("Latest link:")) ?? "";
    logInfo("BACKUP", "db_backup_completed", { durationMs, latestLine });

    return NextResponse.json({
      success: true,
      durationMs,
      output: stdout.split("\n").filter(Boolean).slice(-5),
    });
  } catch (error) {
    logError("BACKUP", error, { area: "db-backup-daily-endpoint" });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function runScript(
  cmd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: process.env,
      cwd: process.cwd(),
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? -1 }));
  });
}
