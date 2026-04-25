import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const TRIGGER_ID_RE = /^trig_[A-Za-z0-9]+$/;
const PROMPT_SUMMARY_MAX = 500;

/**
 * Auto-register check: a Claude Code agent that just created a routine via
 * /schedule can POST to this endpoint with the shared secret to catalog it
 * without an admin browser session. Constant-time compare avoids timing leaks.
 *
 * Coolify v3 sometimes wraps env values with single/double quotes. We strip
 * any combination of surrounding whitespace and quotes from the env value
 * before comparing, so the secret doesn't have to match the literal raw value
 * Coolify stored.
 */
function unwrapEnv(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/^[\s'"`]+|[\s'"`]+$/g, "");
}

function isAutoRegisterRequest(req: NextRequest): boolean {
  const secret = unwrapEnv(process.env.ROUTINES_REGISTER_SECRET);
  if (!secret) return false;
  const header = unwrapEnv(req.headers.get("x-admin-secret") ?? undefined);
  if (!header || header.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= secret.charCodeAt(i) ^ header.charCodeAt(i);
  }
  return mismatch === 0;
}

// GET /api/admin/routines?status=scheduled|ran|cancelled|all
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const status = req.nextUrl.searchParams.get("status") ?? "all";
    const where = status === "all" ? {} : { status };

    const prisma = getPrismaClient();
    const items = await prisma.scheduledAgent.findMany({
      where,
      orderBy: [{ status: "asc" }, { scheduledFor: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({
      routines: items.map((r) => ({
        id: r.id,
        triggerId: r.triggerId,
        name: r.name,
        purpose: r.purpose,
        scheduledFor: r.scheduledFor?.toISOString() ?? null,
        cronExpression: r.cronExpression,
        promptSummary: r.promptSummary,
        model: r.model,
        repo: r.repo,
        status: r.status,
        resultUrl: r.resultUrl,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    logError("ADMIN_ROUTINES", error, { route: "GET /api/admin/routines" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

// POST /api/admin/routines  body: { triggerId, name, purpose?, scheduledFor?, cronExpression?, promptSummary, model?, repo? }
//
// Two auth modes:
//  - Admin browser session (requireAdminPermission)
//  - Header `X-Admin-Secret: <ROUTINES_REGISTER_SECRET>` for auto-registration
//    by a Claude Code agent that just created a routine via /schedule.
export async function POST(req: NextRequest) {
  const autoRegister = isAutoRegisterRequest(req);
  if (!autoRegister) {
    const auth = requireAdminPermission(req, "operations");
    if (auth instanceof NextResponse) return auth;
  }

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

    const triggerId = typeof body.triggerId === "string" ? body.triggerId.trim() : "";
    if (!TRIGGER_ID_RE.test(triggerId)) {
      return NextResponse.json({ error: "INVALID_TRIGGER_ID" }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 200) return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });

    const promptSummary = typeof body.promptSummary === "string"
      ? body.promptSummary.trim().slice(0, PROMPT_SUMMARY_MAX)
      : "";
    if (!promptSummary) return NextResponse.json({ error: "INVALID_PROMPT" }, { status: 400 });

    const scheduledForRaw = typeof body.scheduledFor === "string" ? body.scheduledFor : null;
    const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;
    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      return NextResponse.json({ error: "INVALID_SCHEDULED_FOR" }, { status: 400 });
    }
    const cronExpression = typeof body.cronExpression === "string" && body.cronExpression.trim()
      ? body.cronExpression.trim()
      : null;
    if (!scheduledFor && !cronExpression) {
      return NextResponse.json({ error: "MISSING_SCHEDULE" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const created = await prisma.scheduledAgent.create({
      data: {
        triggerId,
        name,
        purpose: typeof body.purpose === "string" && body.purpose.trim() ? body.purpose.trim().slice(0, 1000) : null,
        scheduledFor,
        cronExpression,
        promptSummary,
        model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : null,
        repo: typeof body.repo === "string" && body.repo.trim() ? body.repo.trim() : null,
        status: "scheduled",
      },
    });
    logInfo("ADMIN_ROUTINES", "routine_registered", {
      id: created.id,
      triggerId,
      via: autoRegister ? "auto" : "admin",
    });
    return NextResponse.json({ routine: created });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "TRIGGER_ID_ALREADY_REGISTERED" }, { status: 409 });
    }
    logError("ADMIN_ROUTINES", error, { route: "POST /api/admin/routines" });
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
