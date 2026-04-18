import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { invalidateAlertRulesCache } from "@/lib/alerts-fire";

export const dynamic = "force-dynamic";

const PERMISSION = "logs";
const LEVELS = new Set(["warn", "error", "any"]);
const CHANNELS = new Set(["telegram", "email", "both"]);

function validatePayload(body: unknown): { ok: true; data: PayloadData } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "INVALID_BODY" };
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { ok: false, error: "NAME_REQUIRED" };
  const level = typeof b.level === "string" ? b.level : "";
  if (!LEVELS.has(level)) return { ok: false, error: "INVALID_LEVEL" };
  const channel = typeof b.channel === "string" ? b.channel : "telegram";
  if (!CHANNELS.has(channel)) return { ok: false, error: "INVALID_CHANNEL" };
  const throttle = typeof b.throttleMinutes === "number" ? Math.max(1, Math.min(1440, b.throttleMinutes)) : 15;
  return {
    ok: true,
    data: {
      name: name.slice(0, 100),
      enabled: b.enabled !== false,
      level,
      tagPattern: typeof b.tagPattern === "string" && b.tagPattern.trim() ? b.tagPattern.trim().slice(0, 100) : null,
      messagePattern: typeof b.messagePattern === "string" && b.messagePattern.trim() ? b.messagePattern.trim().slice(0, 200) : null,
      channel,
      throttleMinutes: throttle,
    },
  };
}

type PayloadData = {
  name: string;
  enabled: boolean;
  level: string;
  tagPattern: string | null;
  messagePattern: string | null;
  channel: string;
  throttleMinutes: number;
};

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const rules = await prisma.alertRule.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items: rules });
  } catch (err) {
    logError("ADMIN_ALERTS", err, { route: "/api/admin/alerts" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const v = validatePayload(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const prisma = getPrismaClient();
    const created = await prisma.alertRule.create({ data: v.data });
    invalidateAlertRulesCache();
    return NextResponse.json({ ok: true, rule: created });
  } catch (err) {
    logError("ADMIN_ALERTS", err, { route: "/api/admin/alerts" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
