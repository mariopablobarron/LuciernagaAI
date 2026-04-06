import { type NextRequest, NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { notifyAdmin } from "@/services/telegram";

export const dynamic = "force-dynamic";

// GET /api/admin/backup?secret=CRON_SECRET
// Triggers a pg_dump via the DATABASE_URL and returns the compressed SQL.
// Called by Coolify scheduled task or cron-job.org.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  try {
    // Parse DATABASE_URL to extract connection params
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || "5432";
    const user = url.username;
    const password = url.password;
    const database = url.pathname.slice(1); // remove leading /

    // Use pg_dump via child_process — available if PostgreSQL client is installed,
    // otherwise fall back to a Prisma-based export
    const { execSync } = await import("child_process");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup_${database}_${timestamp}.sql.gz`;

    // Try pg_dump first
    let backupBuffer: Buffer;
    try {
      const env = { ...process.env, PGPASSWORD: password };
      backupBuffer = execSync(
        `pg_dump --no-owner --no-privileges -h ${host} -p ${port} -U ${user} ${database} | gzip`,
        { env, maxBuffer: 100 * 1024 * 1024, timeout: 120_000 }
      );
    } catch {
      // pg_dump not available — do a lightweight JSON export via Prisma
      const { getPrismaClient } = await import("@/db/prisma");
      const prisma = getPrismaClient();

      const [users, conversations, messages] = await Promise.all([
        prisma.user.count(),
        prisma.conversation.count(),
        prisma.message.count(),
      ]);

      logInfo("BACKUP", "pg_dump_unavailable_fallback", { users, conversations, messages });

      return NextResponse.json({
        ok: false,
        error: "pg_dump not available in container",
        hint: "Run backup from PostgreSQL container: docker exec $(docker ps -qf name=postgres) pg_dump -U postgres DB_NAME | gzip > backup.sql.gz",
        stats: { users, conversations, messages },
      });
    }

    logInfo("BACKUP", "backup_created", { filename, sizeKb: Math.round(backupBuffer.length / 1024) });
    notifyAdmin(`✅ Backup completado: ${filename} (${Math.round(backupBuffer.length / 1024)} KB)`);

    return new Response(new Uint8Array(backupBuffer), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError("BACKUP", error, { action: "backup_failed" });
    notifyAdmin(`❌ Backup falló: ${error instanceof Error ? error.message : "Unknown error"}`);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
