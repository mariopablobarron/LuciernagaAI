import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { invalidateAlertRulesCache } from "@/lib/alerts-fire";

export const dynamic = "force-dynamic";

const PERMISSION = "logs";
const LEVELS = new Set(["warn", "error", "any"]);
const CHANNELS = new Set(["telegram", "email", "both"]);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof b.name === "string") patch.name = b.name.trim().slice(0, 100);
    if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
    if (typeof b.level === "string" && LEVELS.has(b.level)) patch.level = b.level;
    if ("tagPattern" in b) {
      patch.tagPattern = typeof b.tagPattern === "string" && b.tagPattern.trim() ? b.tagPattern.trim().slice(0, 100) : null;
    }
    if ("messagePattern" in b) {
      patch.messagePattern = typeof b.messagePattern === "string" && b.messagePattern.trim() ? b.messagePattern.trim().slice(0, 200) : null;
    }
    if (typeof b.channel === "string" && CHANNELS.has(b.channel)) patch.channel = b.channel;
    if (typeof b.throttleMinutes === "number") {
      patch.throttleMinutes = Math.max(1, Math.min(1440, b.throttleMinutes));
    }

    const prisma = getPrismaClient();
    const updated = await prisma.alertRule.update({ where: { id }, data: patch });
    invalidateAlertRulesCache();
    return NextResponse.json({ ok: true, rule: updated });
  } catch (err) {
    logError("ADMIN_ALERTS", err, { route: "/api/admin/alerts/[id]" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    await prisma.alertRule.delete({ where: { id } });
    invalidateAlertRulesCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("ADMIN_ALERTS", err, { route: "/api/admin/alerts/[id]" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
