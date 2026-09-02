import { getPrismaClient } from "@/db/prisma";
import { pickEmailLocale } from "@/lib/email-i18n";

/**
 * Servicio compartido de listado de posts publicados.
 *
 * Antes vivía inline en `/api/blog/route.ts` y la página `/blog/page.tsx`
 * era client-side y consumía el API en `useEffect`. Resultado: el HTML
 * inicial de `/blog` no contenía ningún `<a href="/blog/{slug}">`, así
 * que Googlebot no descubría los artículos y no se indexaban.
 *
 * Extraer el servicio permite:
 *   - Que `/blog/page.tsx` sea un server component que llama a este
 *     directamente y emite los `<a>` en el HTML inicial (crawlable).
 *   - Que `/api/blog/route.ts` siga funcionando para clientes externos
 *     usando la misma lógica.
 *   - Que `sitemap.ts` reutilice `listPublishedSlugs()` para incluir
 *     todos los posts publicados en el sitemap.xml.
 */

export type BlogPostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  authorName: string;
  publishedAt: Date | null;
};

export type BlogListingResult = {
  posts: BlogPostCard[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  /** Locale realmente servido (puede ser "es" aunque el usuario pida otro,
   *  si no hay posts publicados en su locale). */
  effectiveLocale: string;
  /** true si effectiveLocale !== locale solicitado. */
  fallback: boolean;
};

/**
 * Devuelve una página de posts publicados en el locale pedido.
 * Si no hay posts en ese locale y el locale no es "es", cae a "es"
 * automáticamente (evita blog vacío en EN/PT/FR/DE hasta que se
 * publique/traduzca contenido).
 */
export async function listPublishedPosts(opts: {
  locale: string;
  page?: number;
  pageSize?: number;
  tag?: string;
}): Promise<BlogListingResult> {
  const requestedLocale = pickEmailLocale(opts.locale);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(20, Math.max(1, opts.pageSize ?? 9));
  const tag = opts.tag ?? "";

  const prisma = getPrismaClient();

  function whereFor(loc: string) {
    return {
      status: "published",
      publishedAt: { not: null },
      locale: loc,
      ...(tag ? { tags: { has: tag } } : {}),
    };
  }

  let effectiveLocale = requestedLocale;
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

  return {
    posts,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    effectiveLocale,
    fallback: effectiveLocale !== requestedLocale,
  };
}

/**
 * Lista slugs de TODOS los posts publicados en el locale pedido
 * (sin paginación) — para el sitemap dinámico.
 *
 * Devuelve `{ slug, publishedAt, updatedAt }` para poder computar lastmod
 * correcto por post en el sitemap.xml.
 */
export async function listPublishedSlugs(
  locale: string = "es",
): Promise<Array<{ slug: string; publishedAt: Date | null; updatedAt: Date }>> {
  const prisma = getPrismaClient();
  const posts = await prisma.blogPost.findMany({
    where: { status: "published", publishedAt: { not: null }, locale },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, publishedAt: true, updatedAt: true },
  });
  return posts;
}
