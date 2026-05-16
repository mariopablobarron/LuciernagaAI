import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { pickEmailLocale } from "@/lib/email-i18n";

export const dynamic = "force-dynamic";

// GET /api/blog/[slug] — public single post.
//
// Busca primero (slug, locale) según cookie NEXT_LOCALE. Si no existe en
// ese locale, hace fallback a "es" — así un post solo escrito en español
// sigue siendo accesible desde URLs en otros idiomas.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const locale = pickEmailLocale(req.cookies.get("NEXT_LOCALE")?.value);
  const prisma = getPrismaClient();

  const select = {
    id: true,
    slug: true,
    locale: true,
    title: true,
    excerpt: true,
    content: true,
    blocks: true,
    coverImage: true,
    tags: true,
    authorName: true,
    publishedAt: true,
  } as const;

  // 1. Intento en el locale activo.
  let post = await prisma.blogPost.findUnique({
    where: { slug_locale: { slug, locale } },
    select,
  });

  // 2. Fallback a "es" si no existe en el locale activo.
  if (!post && locale !== "es") {
    post = await prisma.blogPost.findUnique({
      where: { slug_locale: { slug, locale: "es" } },
      select,
    });
  }

  if (!post || post.publishedAt === null) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    post,
    // Telemetría útil para el frontend: si post.locale ≠ locale activo,
    // el usuario está leyendo la versión española de fallback.
    fallback: post.locale !== locale,
  });
}
