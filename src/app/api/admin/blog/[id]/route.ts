import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { syndicatePost } from "@/services/syndication";
import { notifyIndexNowSingle } from "@/services/seo/indexnow";
import { pickEmailLocale } from "@/lib/email-i18n";
import { translatePostToAllLocales } from "@/services/blog-translator";

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

    const existing = await prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, status: true, slug: true, locale: true },
    });
    if (!existing) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title.trim();

    // Locale change (opcional): el admin puede recategorizar un post a otro
    // idioma. Validamos junto al slug porque ambos forman el unique compuesto.
    const newLocale = typeof body.locale === "string"
      ? pickEmailLocale(body.locale)
      : existing.locale;
    if (newLocale !== existing.locale) data.locale = newLocale;

    if (typeof body.slug === "string") {
      const newSlug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
      const conflict = await prisma.blogPost.findFirst({
        where: { slug: newSlug, locale: newLocale, id: { not: id } },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Slug ya existe en idioma ${newLocale}` },
          { status: 409 },
        );
      }
      data.slug = newSlug;
    } else if (newLocale !== existing.locale) {
      // Si solo cambia el locale (sin slug nuevo), verificamos que el slug
      // actual no choque en el locale destino.
      const conflict = await prisma.blogPost.findFirst({
        where: { slug: existing.slug, locale: newLocale, id: { not: id } },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Ya hay un post con slug "${existing.slug}" en idioma ${newLocale}` },
          { status: 409 },
        );
      }
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

    // Side-effects al publicar por PRIMERA vez (transición draft→published).
    // Todos fire-and-forget: el caller recibe el post inmediatamente; los
    // fallos se loggean pero no afectan a la respuesta.
    const becamePublished = body.status === "published" && existing.status !== "published";
    const finalLocale = (data.locale as string | undefined) ?? existing.locale;

    if (becamePublished) {
      // 1. Syndication (cross-post a Reddit/etc).
      void syndicatePost(id).catch((err) =>
        logError("SYNDICATION", err instanceof Error ? err : new Error(String(err)), {
          context: "auto_trigger_on_publish",
          postId: id,
        }),
      );
      // 2. IndexNow: ping inmediato del nuevo post a Bing/Yandex.
      const slug = (data.slug as string | undefined) ?? post.slug;
      void notifyIndexNowSingle(`https://tresmilmillonesdelatidos.es/blog/${slug}`).catch((err) =>
        logError("SEO", err instanceof Error ? err : new Error(String(err)), {
          context: "indexnow_on_publish",
          postId: id,
        }),
      );
      // 3. Auto-traducción: solo si el post fuente es ES. Genera drafts en
      // EN/PT/FR vía LLM. Idempotente — no sobrescribe traducciones existentes.
      // Para regenerar tras editar el ES, usar el botón manual con force=true.
      if (finalLocale === "es") {
        void translatePostToAllLocales(post.id).catch((e) =>
          logError("BLOG_TRANSLATOR", e, { action: "auto_on_publish", postId: post.id }),
        );
      }
    }

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
