import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/admin/tags
// Returns the global list of tags currently in use, with occurrence counts.
// Used for autocomplete in the user tags editor.
export async function GET(req: NextRequest) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const prisma = getPrismaClient();

    // Prisma does not support groupBy on array fields, so fetch all tag arrays
    // and aggregate in memory. Scale: even with 50k users this is trivial.
    const rows = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { tags: true },
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const tag of row.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const tags = Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ tags });
  } catch (error) {
    logError("ADMIN", error, { route: "GET /api/admin/tags" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
