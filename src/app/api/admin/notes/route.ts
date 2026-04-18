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

/**
 * GET /api/admin/notes?status=open|done|all&tag=…
 * Any authenticated admin can read the board.
 */
export async function GET(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrismaClient();
    const url = req.nextUrl;
    const statusParam = url.searchParams.get("status") ?? "open";
    const tagParam = url.searchParams.get("tag");

    const where: { status?: string; tag?: string } = {};
    if (statusParam !== "all" && VALID_STATUSES.has(statusParam)) {
      where.status = statusParam;
    }
    if (tagParam && VALID_TAGS.has(tagParam)) {
      where.tag = tagParam;
    }

    // Show highest priority first, then most recent.
    const notes = await prisma.adminNote.findMany({
      where,
      orderBy: [
        { status: "asc" }, // open before done
        { createdAt: "desc" },
      ],
      take: 500,
    });

    return NextResponse.json({ notes });
  } catch (error) {
    logError("ADMIN_NOTES", error, { route: "GET /api/admin/notes" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

/**
 * POST /api/admin/notes
 * Body: { title, body?, tag?, priority? }
 */
export async function POST(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      title?: string;
      body?: string;
      tag?: string;
      priority?: string;
    };

    const title = body.title?.trim() ?? "";
    if (!title || title.length > 200) {
      return NextResponse.json(
        { error: "Title required (1-200 chars)" },
        { status: 400 },
      );
    }

    const tag = body.tag && VALID_TAGS.has(body.tag) ? body.tag : "general";
    const priority =
      body.priority && VALID_PRIORITIES.has(body.priority)
        ? body.priority
        : "medium";
    const noteBody = body.body?.trim() || null;

    const prisma = getPrismaClient();
    const note = await prisma.adminNote.create({
      data: {
        title,
        body: noteBody,
        tag,
        priority,
        createdBy: auth.adminName ?? null,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    logError("ADMIN_NOTES", error, { route: "POST /api/admin/notes" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
