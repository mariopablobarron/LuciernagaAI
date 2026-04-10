import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/admin/blog/[id] — get single post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    logError("BLOG", error, { action: "get" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/admin/blog/[id] — update a post
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const prisma = getPrismaClient();

    const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title.trim();
    if (typeof body.slug === "string") {
      const newSlug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
      const conflict = await prisma.blogPost.findFirst({ where: { slug: newSlug, id: { not: id } }, select: { id: true } });
      if (conflict) return NextResponse.json({ error: "Slug ya existe" }, { status: 409 });
      data.slug = newSlug;
    }
    if (typeof body.content === "string") data.content = body.content.trim();
    if (body.blocks !== undefined) data.blocks = Array.isArray(body.blocks) ? body.blocks : null;
    if (typeof body.excerpt === "string" || body.excerpt === null) data.excerpt = body.excerpt;
    if (typeof body.coverImage === "string" || body.coverImage === null) data.coverImage = body.coverImage;
    if (Array.isArray(body.tags)) data.tags = body.tags.filter((t: unknown) => typeof t === "string");
    if (typeof body.authorName === "string") data.authorName = body.authorName.trim();
    if (body.status === "published" || body.status === "draft" || body.status === "archived") {
      data.status = body.status;
      // Set publishedAt on first publish
      if (body.status === "published" && existing.status !== "published") {
        data.publishedAt = new Date();
      }
    }

    const post = await prisma.blogPost.update({ where: { id }, data });
    return NextResponse.json({ post });
  } catch (error) {
    logError("BLOG", error, { action: "update" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/admin/blog/[id] — delete a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const prisma = getPrismaClient();

    const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });

    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("BLOG", error, { action: "delete" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
