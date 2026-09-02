import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { listPublishedPosts } from "@/services/blog-listing";

/**
 * Server component. Antes era "use client" y cargaba /api/blog en useEffect
 * — Googlebot veía HTML sin ningún <a> a artículos y no indexaba el blog.
 * Ahora los posts salen server-side y los enlaces son crawlables desde el
 * primer byte.
 *
 * Paginación via query param `?page=N` (server-rendered <Link>) en vez de
 * useState. Funciona sin JS y es compartible por URL.
 */

export const dynamic = "force-dynamic";

const LOCALE_BCP47: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
  de: "de-DE",
};

type SearchParams = { page?: string };

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("blog");

  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const { posts, pagination } = await listPublishedPosts({
    locale,
    page: currentPage,
    pageSize: 9,
  });

  const bcp = LOCALE_BCP47[locale] ?? "en-US";
  function formatDate(iso: Date | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(bcp, { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-violet-400" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{t("title")}</h1>
        </div>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">{t("subtitle")}</p>
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto" />
          <p className="text-zinc-500">{t("empty")}</p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors">
            {t("emptyBack")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden hover:border-violet-500/30 transition-all"
            >
              {/* Cover image */}
              {post.coverImage ? (
                <div className="aspect-video bg-zinc-800 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-violet-500/30" />
                </div>
              )}

              {/* Content */}
              <div className="p-5 space-y-3">
                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <h2 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-2">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                  <span>{post.authorName}</span>
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination — server-rendered <Link>, crawler-friendly */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          {pagination.page > 1 ? (
            <Link
              href={`/blog?page=${pagination.page - 1}`}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> {t("prev")}
            </Link>
          ) : (
            <span className="flex items-center gap-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-600 opacity-30">
              <ChevronLeft className="w-4 h-4" /> {t("prev")}
            </span>
          )}
          <span className="text-sm text-zinc-500">
            {pagination.page} / {pagination.totalPages}
          </span>
          {pagination.page < pagination.totalPages ? (
            <Link
              href={`/blog?page=${pagination.page + 1}`}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all"
            >
              {t("next")} <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="flex items-center gap-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-600 opacity-30">
              {t("next")} <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
