"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  authorName: string;
  publishedAt: string | null;
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?page=${page}&pageSize=9`);
      if (!res.ok) return;
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setPagination(data.pagination ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-violet-400" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Blog</h1>
        </div>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Articulos, reflexiones y recomendaciones sobre bienestar emocional, desarrollo personal e inteligencia artificial.
        </p>
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto" />
          <p className="text-zinc-500">Proximamente publicaremos articulos aqui.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors">
            Volver al inicio <ArrowRight className="w-4 h-4" />
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-sm text-zinc-500">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all disabled:opacity-30"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
