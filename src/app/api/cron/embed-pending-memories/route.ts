import { NextResponse, type NextRequest } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import {
  embedAndStore,
  listPendingMemories,
} from "@/services/semantic-memory";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/embed-pending-memories?secret=CRON_SECRET[&limit=50][&dryRun=1]
 *
 * Daily cron. Scans DailyLog + Conversation.summarySoFar for entries that
 * don't yet have a SemanticMemory row and embeds them in batches.
 *
 * Idempotent: insertion uses ON CONFLICT DO NOTHING on (source, sourceId),
 * so re-runs are safe. Anonymous conversations are skipped (no userId).
 *
 * `?dryRun=1` lists what would be embedded without calling OpenAI or
 * touching the DB — useful when verifying the cron after deploy.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, 200)
    : 50;
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const pending = await listPendingMemories(limit);

    if (dryRun) {
      logInfo("SEMANTIC_MEMORY", "cron_dry_run", { pending: pending.length });
      return NextResponse.json({
        ok: true,
        dryRun: true,
        pending: pending.length,
        breakdown: pending.reduce<Record<string, number>>((acc, p) => {
          acc[p.source] = (acc[p.source] ?? 0) + 1;
          return acc;
        }, {}),
      });
    }

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, pending: 0, inserted: 0 });
    }

    const inserted = await embedAndStore(pending);
    logInfo("SEMANTIC_MEMORY", "cron_completed", {
      pending: pending.length,
      inserted,
    });

    return NextResponse.json({
      ok: true,
      pending: pending.length,
      inserted,
    });
  } catch (error) {
    logError("SEMANTIC_MEMORY", error, { route: "/api/cron/embed-pending-memories" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
