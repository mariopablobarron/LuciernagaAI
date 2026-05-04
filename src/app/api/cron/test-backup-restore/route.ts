import { promises as fs } from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";
import { validateBackupDump } from "@/lib/backup-validation";
import { testBackupRestore } from "@/lib/backup-restore-test";
import { notifyAdmin } from "@/services/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/test-backup-restore?secret=CRON_SECRET[&skipRestore=1]
 *
 * Verifica que el último backup local restaura correctamente:
 *   1. Lee el backup más reciente de BACKUP_DIR (.sql.gz).
 *   2. Validación estática (validateBackupDump): bytes, header, # tables, # inserts.
 *   3. Restore real a schema temporal (testBackupRestore) — si skipRestore=1 lo omite.
 *   4. Notifica al admin OK/KO con métricas.
 *
 * Programar mensual (cron-job.org, 1er domingo a las 05:00 UTC):
 *   0 5 1-7 * 0
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const skipRestore = req.nextUrl.searchParams.get("skipRestore") === "1";
  const dir = process.env.BACKUP_DIR?.trim() ?? "./backups";

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    const msg = `BACKUP_DIR no accesible (${dir}): ${err instanceof Error ? err.message : String(err)}`;
    logError("RESTORE_TEST", err, { dir });
    notifyAdmin(`🚨 Test restore: ${msg}`);
    return NextResponse.json({ error: msg, dir }, { status: 500 });
  }

  const gzFiles = entries.filter((f) => f.endsWith(".sql.gz"));
  if (gzFiles.length === 0) {
    const msg = `Sin archivos .sql.gz en ${dir}. ¿Se ha disparado /api/admin/backup recientemente?`;
    notifyAdmin(`⚠️ Test restore: ${msg}`);
    return NextResponse.json({ error: msg, dir }, { status: 404 });
  }

  // Coger el más reciente por mtime.
  const stats = await Promise.all(
    gzFiles.map(async (f) => ({ f, mtime: (await fs.stat(path.join(dir, f))).mtimeMs })),
  );
  stats.sort((a, b) => b.mtime - a.mtime);
  const latest = stats[0]!.f;
  const fullPath = path.join(dir, latest);
  const buffer = await fs.readFile(fullPath);

  // 1. Validación estática
  const staticValidation = validateBackupDump(buffer);
  logInfo("RESTORE_TEST", "static_validation", {
    file: latest,
    sizeBytes: buffer.length,
    ok: staticValidation.ok,
    tables: staticValidation.tablesDetected.length,
    inserts: staticValidation.insertCount,
    reasons: staticValidation.reasons,
  });

  if (!staticValidation.ok) {
    notifyAdmin(
      `🚨 Test restore: validación estática FALLIDA en ${latest}. Razones: ${staticValidation.reasons.join("; ")}`,
    );
    return NextResponse.json(
      { ok: false, file: latest, staticValidation, restoreTest: null },
      { status: 500 },
    );
  }

  // 2. Restore real (opcional)
  if (skipRestore) {
    notifyAdmin(
      `✅ Test restore (validación estática): ${latest} OK · ${staticValidation.tablesDetected.length} tablas · ${staticValidation.insertCount} inserts`,
    );
    return NextResponse.json({ ok: true, file: latest, staticValidation, restoreTest: null });
  }

  const restoreResult = await testBackupRestore(buffer);

  if (restoreResult.ok) {
    notifyAdmin(
      `✅ Test restore: ${latest} OK · ${restoreResult.tablesRestored} tablas restauradas · User=${restoreResult.sampleCounts.User ?? "?"} · Message=${restoreResult.sampleCounts.Message ?? "?"} · ${restoreResult.durationMs}ms`,
    );
  } else {
    notifyAdmin(
      `🚨 Test restore FALLIDO en ${latest} (stage: ${restoreResult.failedStage}): ${restoreResult.error ?? "unknown"}`,
    );
  }

  return NextResponse.json(
    { ok: restoreResult.ok, file: latest, staticValidation, restoreTest: restoreResult },
    { status: restoreResult.ok ? 200 : 500 },
  );
}
