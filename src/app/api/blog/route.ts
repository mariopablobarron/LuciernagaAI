import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { pickEmailLocale } from "@/lib/email-i18n";

export const dynamic = "force-dynamic";

// GET /api/blog — public listing of published posts.
//
// Filtra por locale activo del usuario (cookie NEXT_LOCALE → "es").
// Fallback: si NO hay posts publicados en el locale activo, devuelve los
// posts en "es" — evita que el blog se vea vacío para usuarios EN/PT/FR
// hasta que se traduzca el contenido.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(20, Math.max(1, parseInt(searchParams.get("pageSize") ?? "9", 10)));
  const tag = searchParams.get("tag") ?? "";
  const locale = pickEmailLocale(req.cookies.get("NEXT_LOCALE")?.value);

  const prisma = getPrismaClient();

  function whereFor(loc: string) {
    return {
      status: "published",
      publishedAt: { not: null },
      locale: loc,
      ...(tag ? { tags: { has: tag } } : {}),
    };
  }

  // Intentamos primero el locale activo. Si no hay posts y no es "es",
  // hacemos fallback al catálogo en español.
  let effectiveLocale = locale;
  let total = await prisma.blogPost.count({ where: whereFor(effectiveLocale) });
  if (total === 0 && effectiveLocale !== "es") {
    effectiveLocale = "es";
    total = await prisma.blogPost.count({ where: whereFor(effectiveLocale) });
  }

  const posts = await prisma.blogPost.findMany({
    where: whereFor(effectiveLocale),
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      tags: true,
      authorName: true,
      publishedAt: true,
    },
  });

  return NextResponse.json({
    posts,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    // Telemetría útil para el frontend: si effectiveLocale ≠ locale, sabemos
    // que estamos sirviendo el fallback en español.
    locale: effectiveLocale,
    fallback: effectiveLocale !== locale,
  });
}
