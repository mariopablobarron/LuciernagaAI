import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";
import { notifyAdmin, sendAdminDocument } from "@/services/telegram";
import { isValidCronSecret } from "@/lib/cron-auth";
import { persistBackupLocally } from "@/lib/backup-storage";
import pg from "pg";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/admin/backup?secret=CRON_SECRET
// Pure-JS PostgreSQL backup — no pg_dump binary needed.
// Returns a gzipped SQL file with CREATE TABLE + COPY data for all tables.
export async function GET(req: NextRequest) {
  // Require admin auth OR CRON_SECRET (for automated backups)
  const hasCronSecret = isValidCronSecret(req.nextUrl.searchParams.get("secret"));
  if (!hasCronSecret) {
    const auth = requireAdminPermission(req, "backup");
    if (auth instanceof NextResponse) return auth;
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  const client = new pg.Client({ connectionString: dbUrl });

  try {
    await client.connect();

    // Get all user tables (exclude Prisma migration table)
    const { rows: tables } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
       ORDER BY tablename`
    );

    const parts: string[] = [
      `-- Backup: ${new Date().toISOString()}`,
      `-- Tables: ${tables.length}`,
      `SET statement_timeout = 0;`,
      `SET client_encoding = 'UTF8';`,
      ``,
    ];

    let totalRows = 0;

    for (const { tablename } of tables) {
      // Get CREATE TABLE DDL
      const { rows: cols } = await client.query<{
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
        character_maximum_length: number | null;
      }>(
        `SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tablename]
      );

      const colDefs = cols.map((c) => {
        let type = c.data_type === "USER-DEFINED" ? `"${c.udt_name}"` : c.data_type;
        if (c.character_maximum_length) type += `(${c.character_maximum_length})`;
        const nullable = c.is_nullable === "NO" ? " NOT NULL" : "";
        const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
        return `  "${c.column_name}" ${type}${nullable}${def}`;
      });

      parts.push(`-- Table: ${tablename}`);
      parts.push(`CREATE TABLE IF NOT EXISTS "${tablename}" (`);
      parts.push(colDefs.join(",\n"));
      parts.push(`);`);
      parts.push(``);

      // Export data as INSERT statements (safe for restore)
      const { rows: data } = await client.query(`SELECT * FROM "${tablename}"`);

      if (data.length > 0) {
        const columnNames = Object.keys(data[0]).map((c) => `"${c}"`).join(", ");

        for (const row of data) {
          const values = Object.values(row)
            .map((v) => {
              if (v === null) return "NULL";
              if (v instanceof Date) return `'${v.toISOString()}'`;
              if (typeof v === "boolean") return v ? "true" : "false";
              if (typeof v === "number") return String(v);
              if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            })
            .join(", ");

          parts.push(`INSERT INTO "${tablename}" (${columnNames}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
        }
        totalRows += data.length;
        parts.push(``);
      }
    }

    await client.end();

    const sql = parts.join("\n");
    const { gzipSync } = await import("zlib");
    const compressed = gzipSync(Buffer.from(sql, "utf-8"));

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup_${timestamp}.sql.gz`;
    const sizeKb = Math.round(compressed.length / 1024);

    logInfo("BACKUP", "backup_created", { filename, sizeKb, tables: tables.length, rows: totalRows });

    // When invoked by cron (?secret=...): upload the file to the admin
    // Telegram chat instead of streaming it back (cron-job.org discards body).
    // Manual admin UI invocation still gets the gzipped file as a download.
    if (hasCronSecret) {
      const caption = `Backup ${timestamp} — ${sizeKb} KB · ${tables.length} tablas · ${totalRows} filas`;
      const delivery = await sendAdminDocument(compressed, filename, caption);

      if (!delivery.ok) {
        const isSizeIssue = delivery.reason === "size_exceeds_limit";

        // Fallback: si Telegram rechaza por tamaño, persistimos al filesystem
        // local. Coherente con `scripts/db-backup-daily.sh` (mismo BACKUP_DIR).
        // Solo se intenta para size_exceeds_limit — errores de auth/red NO
        // se persisten para no enmascarar problemas de configuración.
        let persistedPath: string | null = null;
        let persistError: string | null = null;
        if (isSizeIssue) {
          const persisted = await persistBackupLocally(compressed, filename);
          if (persisted.ok) {
            persistedPath = persisted.absolutePath;
          } else {
            persistError = persisted.error;
          }
        }

        const headline = isSizeIssue
          ? persistedPath
            ? `⚠️ Backup ${filename} (${sizeKb} KB) supera el límite de Telegram (49 MB). Guardado en: ${persistedPath}`
            : `🚨 BACKUP PERDIDO — ${filename} (${sizeKb} KB) supera Telegram y el fallback local también falló (${persistError ?? "unknown"}). Configurar destino externo (S3/R2) URGENTE.`
          : `❌ Backup generado pero no se pudo subir a Telegram: ${filename} (${sizeKb} KB) — ${delivery.error ?? "unknown"}`;
        notifyAdmin(headline);
        logError("BACKUP", new Error(delivery.error ?? "telegram_upload_failed"), {
          filename,
          sizeKb,
          stage: "telegram_upload",
          reason: delivery.reason ?? null,
          persistedPath,
          persistError,
        });

        // Si pudimos persistir local, devolvemos 200 + info útil — el backup
        // existe y está accesible. Si todo falló, 500.
        const status = isSizeIssue && persistedPath ? 200 : 500;
        return NextResponse.json(
          {
            ok: !!(isSizeIssue && persistedPath),
            error: isSizeIssue
              ? persistedPath
                ? null
                : "size_exceeds_telegram_limit_and_local_fallback_failed"
              : "telegram_upload_failed",
            telegramError: delivery.error ?? null,
            reason: delivery.reason ?? null,
            filename,
            sizeKb,
            persistedPath,
            persistError,
          },
          { status },
        );
      }

      return NextResponse.json({
        ok: true,
        filename,
        sizeKb,
        tables: tables.length,
        rows: totalRows,
        deliveredTo: "telegram_admin",
      });
    }

    notifyAdmin(`✅ Backup completado: ${filename} (${sizeKb} KB, ${tables.length} tablas, ${totalRows} filas)`);

    return new Response(new Uint8Array(compressed), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    await client.end().catch(() => {});
    logError("BACKUP", error, { action: "backup_failed" });
    notifyAdmin(`❌ Backup falló: ${error instanceof Error ? error.message : "Unknown error"}`);
    return NextResponse.json(
      { error: "Backup failed" },
      { status: 500 }
    );
  }
}
