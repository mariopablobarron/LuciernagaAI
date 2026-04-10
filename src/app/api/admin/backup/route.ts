import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";
import pg from "pg";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/admin/backup?secret=CRON_SECRET
// Pure-JS PostgreSQL backup — no pg_dump binary needed.
// Returns a gzipped SQL file with CREATE TABLE + COPY data for all tables.
export async function GET(req: NextRequest) {
  // Require admin auth OR CRON_SECRET (for automated backups)
  const secret = req.nextUrl.searchParams.get("secret")?.trim();
  const expectedSecret = process.env.CRON_SECRET?.trim().replace(/[\r\n]/g, "");
  const hasCronSecret = Boolean(secret && expectedSecret && secret === expectedSecret);
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
