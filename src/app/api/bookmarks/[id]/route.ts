/**
 * DELETE /api/bookmarks/[id] — quita un bookmark por su id.
 * Solo el dueño puede borrarlo (verificado por userId).
 */

import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    let userId: string;
    try {
      const identity = await resolveIdentity(req);
      userId = identity.userId;
    } catch (err) {
      if (err instanceof InvalidSessionTokenError) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
      throw err;
    }

    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const result = await prisma.messageBookmark.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    logInfo("BOOKMARKS", "delete", { userId, bookmarkId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("BOOKMARKS", err, { route: "/api/bookmarks/[id]:DELETE" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
