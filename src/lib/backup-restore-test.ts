import { gunzipSync } from "node:zlib";
import pg from "pg";
import { logError, logInfo } from "@/lib/logger";

/**
 * Restore "real" del último backup contra un schema TEMPORAL de la misma DB.
 *
 * Idea: sin necesidad de DB de staging separada, podemos validar que el dump
 * realmente restaura ejecutándolo contra un schema efímero. Toda la operación
 * va dentro de una transacción que SIEMPRE termina con ROLLBACK — nada
 * queda persistido.
 *
 * Pasos:
 *   1. BEGIN
 *   2. CREATE SCHEMA "restore_test_<ts>"
 *   3. SET LOCAL search_path TO "restore_test_<ts>"
 *   4. ejecutar el SQL del dump (CREATE TABLE + INSERT)
 *   5. contar tablas restauradas
 *   6. contar filas en User / Message / Conversation (smoke)
 *   7. ROLLBACK (no commit, garantiza limpieza incluso si falla algo)
 *
 * Requisitos:
 *   - DATABASE_URL apunta a una DB donde el rol tiene CREATE permission.
 *     Roles típicos de Postgres lo tienen sobre databases propias.
 */

export type RestoreTestResult = {
  ok: boolean;
  durationMs: number;
  schemaName: string;
  tablesRestored: number;
  /** Counts en tablas críticas. -1 indica que la tabla no existía en el dump. */
  sampleCounts: Record<string, number>;
  /** Mensaje de error si algo falló. */
  error?: string;
  /** Stage donde ocurrió el error (útil para debugging). */
  failedStage?: "connect" | "begin" | "create_schema" | "execute_dump" | "count" | "rollback";
};

const SAMPLE_TABLES = ["User", "Message", "Conversation"];

export async function testBackupRestore(buffer: Buffer): Promise<RestoreTestResult> {
  const start = Date.now();
  const schemaName = `restore_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result: RestoreTestResult = {
    ok: false,
    durationMs: 0,
    schemaName,
    tablesRestored: 0,
    sampleCounts: {},
  };

  let sql: string;
  try {
    const isGzip = buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
    sql = isGzip ? gunzipSync(buffer).toString("utf-8") : buffer.toString("utf-8");
  } catch (err) {
    result.error = `gunzip failed: ${err instanceof Error ? err.message : String(err)}`;
    result.failedStage = "execute_dump";
    result.durationMs = Date.now() - start;
    return result;
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    result.error = "DATABASE_URL not set";
    result.failedStage = "connect";
    result.durationMs = Date.now() - start;
    return result;
  }

  const client = new pg.Client({ connectionString: dbUrl, statement_timeout: 240_000 });

  try {
    await client.connect();
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    result.failedStage = "connect";
    result.durationMs = Date.now() - start;
    return result;
  }

  try {
    await client.query("BEGIN");

    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET LOCAL search_path TO "${schemaName}"`);
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      result.failedStage = "create_schema";
      return result;
    }

    try {
      // El cliente pg soporta multi-statement queries con ; separator.
      await client.query(sql);
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      result.failedStage = "execute_dump";
      return result;
    }

    try {
      const tablesRes = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM pg_tables WHERE schemaname = $1`,
        [schemaName],
      );
      result.tablesRestored = Number(tablesRes.rows[0]?.count ?? 0);

      for (const tbl of SAMPLE_TABLES) {
        try {
          const r = await client.query<{ count: string }>(
            `SELECT COUNT(*) AS count FROM "${schemaName}"."${tbl}"`,
          );
          result.sampleCounts[tbl] = Number(r.rows[0]?.count ?? 0);
        } catch {
          // tabla no existe en el dump — registramos -1
          result.sampleCounts[tbl] = -1;
        }
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      result.failedStage = "count";
      return result;
    }

    result.ok = result.tablesRestored > 0;
    return result;
  } finally {
    try {
      await client.query("ROLLBACK");
    } catch (err) {
      // Si ya falló y la transacción está abortada, ROLLBACK puede dar error.
      // Lo logueamos pero no lo elevamos — la DB se limpiará al cerrar conexión.
      logInfo("RESTORE_TEST", "rollback_warning", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    await client.end().catch(() => {});
    result.durationMs = Date.now() - start;
    if (result.ok) {
      logInfo("RESTORE_TEST", "restore_test_passed", {
        schemaName,
        tablesRestored: result.tablesRestored,
        sampleCounts: result.sampleCounts,
        durationMs: result.durationMs,
      });
    } else {
      logError("RESTORE_TEST", new Error(result.error ?? "unknown"), {
        schemaName,
        failedStage: result.failedStage,
        durationMs: result.durationMs,
      });
    }
  }
}
