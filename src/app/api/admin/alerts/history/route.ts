import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "logs";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const VALID_LEVELS = new Set(["critical", "warning", "info"]);

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = req.nextUrl;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT),
    );
    const ruleId = url.searchParams.get("ruleId")?.trim() || undefined;
    const levelParam = url.searchParams.get("level")?.trim() || undefined;
    const level = levelParam && VALID_LEVELS.has(levelParam) ? levelParam : undefined;
    const sinceParam = url.searchParams.get("since")?.trim();
    const since = sinceParam ? new Date(sinceParam) : null;
    const cursor = url.searchParams.get("cursor")?.trim() || undefined;

    const prisma = getPrismaClient();

    const firings = await prisma.alertFiring.findMany({
      where: {
        ...(ruleId ? { ruleId } : {}),
        ...(level ? { level } : {}),
        ...(since && !Number.isNaN(since.getTime())
          ? { firedAt: { gte: since } }
          : {}),
      },
      include: {
        rule: { select: { id: true, name: true, channel: true } },
      },
      orderBy: { firedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = firings.length > limit;
    const items = hasMore ? firings.slice(0, limit) : firings;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return NextResponse.json({
      items: items.map((f) => ({
        id: f.id,
        firedAt: f.firedAt.toISOString(),
        level: f.level,
        channel: f.channel,
        title: f.title,
        message: f.message,
        tag: f.tag,
        delivered: f.delivered,
        errorReason: f.errorReason,
        rule: f.rule
          ? { id: f.rule.id, name: f.rule.name, channel: f.rule.channel }
          : null,
      })),
      nextCursor,
      filters: {
        limit,
        ruleId: ruleId ?? null,
        level: level ?? null,
        since: since && !Number.isNaN(since.getTime()) ? since.toISOString() : null,
      },
    });
  } catch (error) {
    logError("ADMIN_ALERTS_HISTORY", error, { stage: "list_firings" });
    return NextResponse.json({ error: "history_query_failed" }, { status: 500 });
  }
}
