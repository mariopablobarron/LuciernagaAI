import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "users:tag";
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;
const TAG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

function normalize(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    if (t.length > MAX_TAG_LENGTH) continue;
    if (!TAG_PATTERN.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, tags: true },
    });
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ tags: user.tags });
  } catch (error: unknown) {
    logError("ADMIN_USERS", error, { route: "tags_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

/**
 * Replaces the user's tags array. Body: { tags: string[] }.
 * Tags are normalized: lowercase, alphanumeric + underscore/dash, max 20 unique tags,
 * max 40 chars each. Invalid tags are silently dropped.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await req.json()) as { tags?: string[] };
    if (!Array.isArray(body.tags)) {
      return NextResponse.json({ error: "tags array required" }, { status: 400 });
    }
    const tags = normalize(body.tags);
    const prisma = getPrismaClient();
    const user = await prisma.user.update({
      where: { id },
      data: { tags },
      select: { id: true, tags: true },
    });
    logInfo("ADMIN_USERS", "tags_updated", {
      userId: id,
      tags,
      by: auth.adminName,
    });
    return NextResponse.json({ tags: user.tags });
  } catch (error: unknown) {
    logError("ADMIN_USERS", error, { route: "tags_PUT" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
