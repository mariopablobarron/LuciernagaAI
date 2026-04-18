"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Save, Eye, Globe, Loader2 } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { blocksToPlainText } from "@/components/BlockEditor";
import { toast } from "sonner";
import type { Block } from "@blocknote/core";

const BlockEditor = dynamic(() => import("@/components/BlockEditor"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />,
});

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  blocks: Block[] | null;
  coverImage: string | null;
  tags: string[];
  status: string;
  authorName: string;
  publishedAt: string | null;
};

export default function BlogEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [authorName, setAuthorName] = useState("Equipo Tres Mil Millones de Latidos");
  const [status, setStatus] = useState("draft");
  const [initialBlocks, setInitialBlocks] = useState<Block[] | undefined>(undefined);
  const blocksRef = useRef<Block[]>([]);
  const [postId, setPostId] = useState(isNew ? null : id);

  // Auto-generate slug from title
  useEffect(() => {
    if (isNew && title && !slug) {
      // Don't auto-generate if user has manually typed a slug
    }
  }, [isNew, title, slug]);

  const generateSlug = () => {
    setSlug(title.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  // Load existing post
  const loadPost = useCallback(async () => {
    if (isNew) return;
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { toast.error("Post no encontrado"); router.push("/admin/blog"); return; }
      const data = await res.json();
      const post: BlogPost = data.post;
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt ?? "");
      setCoverImage(post.coverImage ?? "");
      setTagsInput(post.tags.join(", "));
      setAuthorName(post.authorName);
      setStatus(post.status);
      if (post.blocks && Array.isArray(post.blocks) && post.blocks.length > 0) {
        setInitialBlocks(post.blocks);
        blocksRef.current = post.blocks;
      }
      setPostId(post.id);
    } catch { toast.error("Error cargando post"); }
    finally { setLoading(false); }
  }, [id, isNew, router]);

  useEffect(() => { void loadPost(); }, [loadPost]);

  // Save
  async function handleSave(publishNow = false) {
    if (!title.trim()) { toast.error("El titulo es obligatorio"); return; }

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, "-").replace(/(^-|-$)/g, "");
    const blocks = blocksRef.current;
    const content = blocksToPlainText(blocks);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim() || null,
        content,
        blocks,
        coverImage: coverImage.trim() || null,
        tags,
        authorName: authorName.trim(),
        status: publishNow ? "published" : status,
      };

      const url = postId ? `/api/admin/blog/${postId}` : "/api/admin/blog";
      const method = postId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? `Error ${res.status}`);
        return;
      }

      const data = await res.json();
      if (!postId && data.post?.id) {
        setPostId(data.post.id);
        setSlug(data.post.slug);
      }
      if (publishNow) setStatus("published");

      toast.success(publishNow ? "Publicado" : "Guardado");

      if (isNew && data.post?.id) {
        router.replace(`/admin/blog/${data.post.id}`);
      }
    } catch { toast.error("Error de red"); }
    finally { setSaving(false); }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <AdminShell title="Cargando..." subtitle="" onLogout={handleLogout} showSectionNav={false}>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={isNew ? "Nuevo articulo" : "Editar articulo"}
      subtitle={slug ? `/blog/${slug}` : ""}
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/blog" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main editor */}
        <div className="space-y-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulo del articulo"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-lg font-bold text-white placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />

          {/* Block editor */}
          <BlockEditor
            key={postId ?? "new"}
            initialBlocks={initialBlocks}
            onChange={(blocks) => { blocksRef.current = blocks; }}
            className="min-h-[400px]"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? "Guardando..." : "Guardar borrador"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 transition-colors disabled:opacity-40"
              >
                <Eye className="w-3.5 h-3.5" /> Publicar
              </button>
            </div>
            {status === "published" && slug && (
              <a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                <Globe className="w-3.5 h-3.5" /> Ver en web
              </a>
            )}
          </div>

          {/* Slug */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Slug (URL)</label>
            <div className="flex gap-2">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="mi-articulo"
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
              />
              <button onClick={generateSlug} className="rounded-lg border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-400 hover:text-white transition-colors">Auto</button>
            </div>
            {slug && <p className="text-[10px] text-zinc-600">/blog/{slug}</p>}
          </div>

          {/* Excerpt */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Resumen</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Breve descripcion para tarjetas y SEO..."
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          {/* Cover image */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Imagen de portada (URL)</label>
            <input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Etiquetas</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="bienestar, IA, desarrollo personal"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
            <p className="text-[10px] text-zinc-600">Separadas por comas</p>
          </div>

          {/* Author */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Autor</label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
