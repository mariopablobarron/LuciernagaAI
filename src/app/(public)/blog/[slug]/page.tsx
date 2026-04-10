"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, BookOpen, Calendar, User, Tag } from "lucide-react";
import type { Block } from "@blocknote/core";

const BlockEditor = dynamic(() => import("@/components/BlockEditor"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />,
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
  authorName: string;
  publishedAt: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => { if (d?.post) setPost(d.post); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-zinc-700 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Articulo no encontrado</h1>
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al blog
        </Link>
      </div>
    );
  }

  const hasBlocks = post.blocks && Array.isArray(post.blocks) && post.blocks.length > 0;

  return (
    <article className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      {/* Back */}
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Blog
      </Link>

      {/* Cover */}
      {post.coverImage && (
        <div className="aspect-video rounded-2xl overflow-hidden border border-zinc-800">
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{post.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" /> {post.authorName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> {formatDate(post.publishedAt)}
          </span>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-medium text-violet-300">
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="prose-custom">
        {hasBlocks ? (
          <BlockEditor
            initialBlocks={post.blocks!}
            editable={false}
            className="border-none bg-transparent p-0 shadow-none min-h-0"
          />
        ) : (
          <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 text-center space-y-4">
        <p className="text-lg font-semibold text-white">¿Quieres pasar del bloqueo a la accion?</p>
        <p className="text-sm text-zinc-400">Tres Mil Millones de Latidos te acompana con IA. Gratis durante el MVP.</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-bold text-white hover:from-violet-400 hover:to-fuchsia-400 transition-all"
        >
          Empezar ahora
        </Link>
      </div>

      {/* Back to blog */}
      <div className="text-center">
        <Link href="/blog" className="text-sm text-zinc-500 hover:text-violet-400 transition-colors">
          ← Volver al blog
        </Link>
      </div>
    </article>
  );
}
