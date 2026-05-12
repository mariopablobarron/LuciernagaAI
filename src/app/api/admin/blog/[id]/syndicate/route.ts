import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { ALL_PLATFORMS, syndicatePost, type Platform } from "@/services/syndication";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/blog/[id]/syndicate
 *   Returns current syndication state for a post (one row per platform).
 *
 * POST /api/admin/blog/[id]/syndicate
 *   Body: { platforms?: Platform[]; force?: boolean }
 *   Triggers (or retries) syndication for the given platforms.
 *   - `force=true` re-publishes even if a previous attempt succeeded.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    const rows = await prisma.blogSyndication.findMany({
      where: { blogPostId: id },
      orderBy: { platform: "asc" },
    });
    return NextResponse.json({ syndications: rows });
  } catch (error) {
    logError("SYNDICATION", error, { action: "list" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      platforms?: Platform[];
      force?: boolean;
    };

    const requested = Array.isArray(body.platforms)
      ? body.platforms.filter((p): p is Platform => ALL_PLATFORMS.includes(p))
      : ALL_PLATFORMS;

    if (requested.length === 0) {
      return NextResponse.json({ error: "No valid platforms requested" }, { status: 400 });
    }

    const results = await syndicatePost(id, { platforms: requested, force: !!body.force });
    return NextResponse.json({ results });
  } catch (error) {
    logError("SYNDICATION", error, { action: "trigger" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
