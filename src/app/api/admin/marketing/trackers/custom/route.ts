import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PROVIDERS = ["hotjar", "clarity", "plausible", "posthog"] as const;
type Provider = (typeof PROVIDERS)[number];

const NAME_MAX = 80;
const ID_MAX = 200;
const APIHOST_MAX = 200;
const NOTES_MAX = 500;

function validate(input: {
  provider?: string;
  name?: string;
  identifier?: string;
  apiHost?: string | null;
  notes?: string | null;
}): { ok: true; data: { provider: Provider; name: string; identifier: string; apiHost: string | null; notes: string | null } } | { ok: false; error: string } {
  if (!input.provider || !PROVIDERS.includes(input.provider as Provider)) {
    return { ok: false, error: `INVALID_PROVIDER (allowed: ${PROVIDERS.join(", ")})` };
  }
  const provider = input.provider as Provider;

  const name = input.name?.trim() ?? "";
  if (!name || name.length > NAME_MAX) return { ok: false, error: "INVALID_NAME" };

  const identifier = input.identifier?.trim() ?? "";
  if (!identifier || identifier.length > ID_MAX) return { ok: false, error: "INVALID_IDENTIFIER" };
  // basic anti-injection — identifiers must be alphanumeric with limited symbols
  if (!/^[A-Za-z0-9._\-/:]+$/.test(identifier)) {
    return { ok: false, error: "IDENTIFIER_HAS_INVALID_CHARS" };
  }

  let apiHost: string | null = null;
  if (input.apiHost && input.apiHost.trim()) {
    const trimmed = input.apiHost.trim();
    if (trimmed.length > APIHOST_MAX) return { ok: false, error: "INVALID_APIHOST" };
    if (!/^https?:\/\/[A-Za-z0-9.\-_/:]+$/.test(trimmed)) return { ok: false, error: "APIHOST_NOT_URL" };
    apiHost = trimmed;
  }

  let notes: string | null = null;
  if (input.notes && input.notes.trim()) {
    notes = input.notes.trim().slice(0, NOTES_MAX);
  }

  return { ok: true, data: { provider, name, identifier, apiHost, notes } };
}

// GET /api/admin/marketing/trackers/custom
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:metrics");
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const trackers = await prisma.customTracker.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({
      trackers: trackers.map((t) => ({
        id: t.id,
        provider: t.provider,
        name: t.name,
        identifier: t.identifier,
        apiHost: t.apiHost,
        notes: t.notes,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    logError("ADMIN_CUSTOM_TRACKERS", error, { route: "GET /api/admin/marketing/trackers/custom" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

// POST /api/admin/marketing/trackers/custom
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:metrics");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

    const v = validate({
      provider: typeof body.provider === "string" ? body.provider : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      identifier: typeof body.identifier === "string" ? body.identifier : undefined,
      apiHost: typeof body.apiHost === "string" ? body.apiHost : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const prisma = getPrismaClient();
    const tracker = await prisma.customTracker.create({
      data: { ...v.data, isActive: true },
    });
    logInfo("ADMIN_CUSTOM_TRACKERS", "tracker_created", { id: tracker.id, provider: tracker.provider });
    return NextResponse.json({ tracker });
  } catch (error) {
    logError("ADMIN_CUSTOM_TRACKERS", error, { route: "POST /api/admin/marketing/trackers/custom" });
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
