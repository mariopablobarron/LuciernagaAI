import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { runAllChecks, summarize, type CheckResult } from "@/lib/statusChecks";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type CacheEntry = {
  generatedAt: number;
  durationMs: number;
  results: CheckResult[];
};

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "status");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const force = req.nextUrl.searchParams.get("force") === "1";
  const now = Date.now();

  try {
    if (!force && cache && now - cache.generatedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        cached: true,
        generatedAt: new Date(cache.generatedAt).toISOString(),
        durationMs: cache.durationMs,
        summary: summarize(cache.results),
        results: cache.results,
      });
    }

    const started = Date.now();
    const results = await runAllChecks();
    const durationMs = Date.now() - started;
    cache = { generatedAt: now, durationMs, results };

    return NextResponse.json({
      cached: false,
      generatedAt: new Date(now).toISOString(),
      durationMs,
      summary: summarize(results),
      results,
    });
  } catch (error: unknown) {
    logError("ADMIN_STATUS", error, { action: "run_checks" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to run status checks." },
      { status: 500 },
    );
  }
}, { limit: 30 });
