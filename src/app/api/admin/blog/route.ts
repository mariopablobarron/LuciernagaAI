import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { pickEmailLocale } from "@/lib/email-i18n";
import { translatePostToAllLocales } from "@/services/blog-translator";

export const dynamic = "force-dynamic";

// GET /api/admin/blog — list all posts (admin view, includes drafts)
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") ?? "";
    const localeFilter = searchParams.get("locale") ?? ""; // "" = todos los idiomas
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const where = {
      ...(status ? { status } : {}),
      ...(localeFilter ? { locale: localeFilter } : {}),
    };
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logError("BLOG", error, { action: "admin_list" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/admin/blog — create a new post
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "marketing:campaign");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Titulo requerido" }, { status: 400 });
    }

    const slug = typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "")
      : title.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, "-").replace(/(^-|-$)/g, "");

    const content = typeof body.content === "string" ? body.content.trim() : "";
    const blocks = Array.isArray(body.blocks) ? body.blocks : null;
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : null;
    const coverImage = typeof body.coverImage === "string" ? body.coverImage.trim() : null;
    const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [];
    const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "Equipo Tres Mil Millones de Latidos";
    const status = body.status === "published" ? "published" : "draft";
    // Idioma del post — admin lo selecciona en el form. Default "es".
    const locale = pickEmailLocale(typeof body.locale === "string" ? body.locale : null);

    const prisma = getPrismaClient();

    // Unique compuesto (slug, locale): mismo slug puede existir en distintos
    // idiomas. Solo bloqueamos si ya hay un post con ese slug en ESTE locale.
    const existing = await prisma.blogPost.findUnique({
      where: { slug_locale: { slug, locale } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Slug ya existe en idioma ${locale}. Elige otro o cambia el idioma.` },
        { status: 409 },
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        locale,
        title,
        excerpt,
        content,
        blocks,
        coverImage,
        tags,
        status,
        authorName,
        publishedAt: status === "published" ? new Date() : null,
      },
    });

    // Auto-traducción: si el post es ES y se publica directamente, dispara
    // la generación de drafts EN/PT/FR en background. Mario los revisa después
    // en /admin/blog (filtros por idioma + bandera). Si solo se guarda como
    // draft, NO se traduce — esperamos a que esté listo para publicar.
    // Idempotente: si ya existen drafts, no los sobrescribe.
    if (locale === "es" && status === "published") {
      void translatePostToAllLocales(post.id).catch((e) =>
        logError("BLOG_TRANSLATOR", e, { action: "auto_on_create", postId: post.id }),
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    logError("BLOG", error, { action: "create" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
