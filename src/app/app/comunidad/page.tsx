"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, User } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Post = {
  id: string;
  content: string;
  phase: string | null;
  anonymous: boolean;
  authorName: string | null;
  likes: number;
  createdAt: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

// ─── Phase tag colors ───────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  bloqueo: "bg-red-500/20 text-red-300",
  exploracion: "bg-amber-500/20 text-amber-300",
  decision: "bg-cyan-500/20 text-cyan-300",
  accion: "bg-emerald-500/20 text-emerald-300",
  consistencia: "bg-violet-500/20 text-violet-300",
};

const PHASE_OPTIONS = [
  { value: "", label: "Sin fase" },
  { value: "bloqueo", label: "Bloqueo" },
  { value: "exploracion", label: "Exploracion" },
  { value: "decision", label: "Decision" },
  { value: "accion", label: "Accion" },
  { value: "consistencia", label: "Consistencia" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ComunidadPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts
  useEffect(() => {
    fetch("/api/community", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPosts(d.posts ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Submit new post
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: content.trim(),
          phase: phase || undefined,
          anonymous,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Error al publicar.");
        return;
      }

      // Prepend new post to feed
      setPosts((prev) => [
        {
          id: data.post.id,
          content: data.post.content,
          phase: data.post.phase,
          anonymous: data.post.anonymous,
          authorName: null, // anonymous by default display
          likes: 0,
          createdAt: data.post.createdAt,
        },
        ...prev,
      ]);
      setContent("");
      setPhase("");
    } catch {
      setError("Error de conexion.");
    } finally {
      setSubmitting(false);
    }
  }

  // Like a post
  async function handleLike(postId: string) {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p)),
    );

    try {
      await fetch(`/api/community/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: p.likes - 1 } : p)),
      );
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
            <MessageCircle className="h-5 w-5 text-cyan-400" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-white">Comunidad</h1>
          <p className="text-sm text-zinc-400">
            Reflexiones compartidas de la comunidad
          </p>
        </div>

        {/* ── New post form ────────────────────────────────────────────── */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Compartir reflexion
          </h2>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe tu reflexion..."
            maxLength={1000}
            rows={3}
            className="mb-3 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />

          <div className="flex flex-wrap items-center gap-3">
            {/* Phase selector */}
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 focus:border-cyan-500/50 focus:outline-none"
            >
              {PHASE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Anonymous toggle */}
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/30"
              />
              Anonimo
            </label>

            <div className="flex-1" />

            {/* Character count */}
            {content.length > 0 && (
              <span
                className={`text-xs ${content.length > 900 ? "text-amber-500" : "text-zinc-600"}`}
              >
                {content.length}/1000
              </span>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Publicar
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </form>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        )}

        {/* ── Posts feed ───────────────────────────────────────────────── */}
        {!loading && (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                {/* Author & time */}
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800">
                    <User className="h-3 w-3 text-zinc-500" />
                  </div>
                  <span className="text-xs text-zinc-400">
                    {post.anonymous || !post.authorName
                      ? "Alguien de la comunidad"
                      : post.authorName}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {timeAgo(post.createdAt)}
                  </span>
                </div>

                {/* Content */}
                <p className="mb-3 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Footer: phase tag + like */}
                <div className="flex items-center gap-2">
                  {post.phase && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        PHASE_COLORS[post.phase] ?? "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {post.phase}
                    </span>
                  )}

                  <div className="flex-1" />

                  <button
                    onClick={() => void handleLike(post.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    {post.likes > 0 && <span>{post.likes}</span>}
                  </button>
                </div>
              </div>
            ))}

            {posts.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-zinc-500">
                  Se la primera persona en compartir una reflexion.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
