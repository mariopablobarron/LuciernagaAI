"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Globe,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { toast } from "sonner";

type BlogPost = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  status: string;
  authorName: string;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
};

const LOCALE_FLAG: Record<string, string> = {
  es: "🇪🇸",
  en: "🇬🇧",
  pt: "🇵🇹",
  fr: "🇫🇷",
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  published: { label: "Publicado", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  archived: { label: "Archivado", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [localeFilter, setLocaleFilter] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (filter) params.set("status", filter);
      if (localeFilter) params.set("locale", localeFilter);
      const res = await fetch(`/api/admin/blog?${params}`, { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { toast.error("Error cargando posts"); return; }
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setPagination(data.pagination ?? null);
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }, [page, filter, localeFilter, router]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Eliminar "${title}"? No se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Post eliminado"); load(); }
      else toast.error("Error al eliminar");
    } catch { toast.error("Error de red"); }
  }

  async function handleToggleStatus(post: BlogPost) {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { toast.success(newStatus === "published" ? "Publicado" : "Despublicado"); load(); }
      else toast.error("Error al cambiar estado");
    } catch { toast.error("Error de red"); }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <AdminShell
      title="Blog / Noticias"
      subtitle="Publica articulos, recomendaciones y noticias."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "Todos" },
            { value: "draft", label: "Borradores" },
            { value: "published", label: "Publicados" },
            { value: "archived", label: "Archivados" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.value
                  ? "border-violet-500/30 bg-violet-500 text-white"
                  : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
          {/* Locale filter — separado visualmente */}
          <span className="text-zinc-700 mx-1 self-center">·</span>
          {[
            { value: "", label: "Todos idiomas" },
            { value: "es", label: "🇪🇸 ES" },
            { value: "en", label: "🇬🇧 EN" },
            { value: "pt", label: "🇵🇹 PT" },
            { value: "fr", label: "🇫🇷 FR" },
          ].map((f) => (
            <button
              key={`loc-${f.value}`}
              onClick={() => { setLocaleFilter(f.value); setPage(1); }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                localeFilter === f.value
                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                  : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button onClick={() => void load()} disabled={loading} className="p-1.5 text-zinc-500 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo articulo
        </Link>
      </div>

      {/* Stats */}
      {pagination && (
        <p className="text-xs text-zinc-500">{pagination.total} articulo{pagination.total !== 1 ? "s" : ""} en total</p>
      )}

      {/* Post list */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-400">No hay articulos todavia.</p>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Crear el primero
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft;
            return (
              <div key={post.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span title={post.locale} className="shrink-0 text-sm leading-none">{LOCALE_FLAG[post.locale] ?? "🌐"}</span>
                    <Link href={`/admin/blog/${post.id}`} className="text-sm font-semibold text-white hover:text-violet-300 transition-colors truncate">
                      {post.title}
                    </Link>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{post.authorName}</span>
                    <span>·</span>
                    <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                    {post.tags.length > 0 && (
                      <>
                        <span>·</span>
                        {post.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px]">{t}</span>
                        ))}
                      </>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{post.excerpt}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {post.status === "published" && (
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-zinc-600 hover:text-cyan-400 transition-colors" title="Ver en web">
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => handleToggleStatus(post)} className="p-1.5 text-zinc-600 hover:text-emerald-400 transition-colors" title={post.status === "published" ? "Despublicar" : "Publicar"}>
                    {post.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <Link href={`/admin/blog/${post.id}`} className="p-1.5 text-zinc-600 hover:text-violet-400 transition-colors" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => handleDelete(post.id, post.title)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Pagina {pagination.page} de {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-30">Anterior</button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-30">Siguiente</button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
