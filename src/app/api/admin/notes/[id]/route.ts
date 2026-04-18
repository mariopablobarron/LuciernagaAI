import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VALID_TAGS = new Set([
  "general",
  "referrals",
  "migration",
  "env",
  "cron",
  "ui",
  "incident",
]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);
const VALID_STATUSES = new Set(["open", "done"]);

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/notes/[id]
 * Body: { title?, body?, tag?, priority?, status? }
 */
export async function PATCH(req: NextRequest, ctx: RouteParams) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      title?: string;
      body?: string | null;
      tag?: string;
      priority?: string;
      status?: string;
    };

    const data: {
      title?: string;
      body?: string | null;
      tag?: string;
      priority?: string;
      status?: string;
      resolvedAt?: Date | null;
      resolvedBy?: string | null;
    } = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title || title.length > 200) {
        return NextResponse.json(
          { error: "Title must be 1-200 chars" },
          { status: 400 },
        );
      }
      data.title = title;
    }
    if (body.body !== undefined) {
      data.body = body.body === null ? null : body.body.trim() || null;
    }
    if (body.tag && VALID_TAGS.has(body.tag)) data.tag = body.tag;
    if (body.priority && VALID_PRIORITIES.has(body.priority)) {
      data.priority = body.priority;
    }
    if (body.status && VALID_STATUSES.has(body.status)) {
      data.status = body.status;
      if (body.status === "done") {
        data.resolvedAt = new Date();
        data.resolvedBy = auth.adminName ?? null;
      } else {
        data.resolvedAt = null;
        data.resolvedBy = null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const note = await prisma.adminNote.update({
      where: { id },
      data,
    });

    return NextResponse.json({ note });
  } catch (error) {
    logError("ADMIN_NOTES", error, { route: "PATCH /api/admin/notes/[id]" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/notes/[id]
 */
export async function DELETE(req: NextRequest, ctx: RouteParams) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const prisma = getPrismaClient();
    await prisma.adminNote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("ADMIN_NOTES", error, { route: "DELETE /api/admin/notes/[id]" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
