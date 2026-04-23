import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { withRateLimit } from "@/lib/rate-limit";
import { resolveUserIdsFromFilter, type AdminUsersFilter } from "../_shared/resolve-filter";

export const dynamic = "force-dynamic";

const TAG_PATTERN = /^[a-z0-9_-]{1,40}$/;
const MAX_TAGS_PER_USER = 20;
const MAX_USERS = 500;

function normalize(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const n = t.trim().toLowerCase();
    if (!TAG_PATTERN.test(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

// POST /api/admin/users/bulk-tag
// body: { userIds: string[], add?: string[], remove?: string[] }
export const POST = withRateLimit(
  async function POST(req: NextRequest) {
    try {
      const adminAuth = requireAdminPermission(req, "users:update");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const body = (await req.json()) as {
        userIds?: unknown;
        filter?: AdminUsersFilter;
        add?: unknown;
        remove?: unknown;
      };

      let userIds: string[] = [];
      let truncated = false;
      let filterTotal = 0;
      if (body.filter && typeof body.filter === "object") {
        const resolved = await resolveUserIdsFromFilter(body.filter);
        userIds = resolved.userIds;
        truncated = resolved.truncated;
        filterTotal = resolved.total;
      } else if (Array.isArray(body.userIds)) {
        userIds = body.userIds
          .filter((x): x is string => typeof x === "string")
          .slice(0, MAX_USERS);
      }
      const addTags = normalize(body.add);
      const removeTags = normalize(body.remove);

      if (userIds.length === 0) {
        return NextResponse.json({ error: "NO_USERS" }, { status: 400 });
      }
      if (addTags.length === 0 && removeTags.length === 0) {
        return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });
      }

      const prisma = getPrismaClient();
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, tags: true },
      });

      let updated = 0;
      for (const u of users) {
        const next = Array.from(
          new Set([...u.tags.filter((t) => !removeTags.includes(t)), ...addTags]),
        ).slice(0, MAX_TAGS_PER_USER);
        await prisma.user.update({
          where: { id: u.id },
          data: { tags: next },
        });
        updated++;
      }

      audit({
        actorId: adminAuth.adminName ?? "admin",
        actorType: "admin",
        action: "update",
        resource: "User",
        metadata: { bulk: "tag", count: updated, add: addTags, remove: removeTags },
      });

      logInfo("ADMIN", "bulk_tag", { updated, add: addTags, remove: removeTags, fromFilter: !!body.filter });

      return NextResponse.json({
        success: true,
        updated,
        add: addTags,
        remove: removeTags,
        truncated,
        filterTotal,
      });
    } catch (error) {
      logError("ADMIN", error, { route: "POST /api/admin/users/bulk-tag" });
      return NextResponse.json({ error: "BULK_TAG_FAILED" }, { status: 500 });
    }
  },
  { limit: 10 },
);
