"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Hash,
  LogOut,
  MessageSquare,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ConversationData = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  rating: number | null;
  journalMode: boolean;
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  messages: Message[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtFull(value: string): string {
  return new Date(value).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/60 ${className ?? ""}`} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminConversationPage() {
  const { id: userId, convId } = useParams<{ id: string; convId: string }>();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<ConversationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/conversations/${convId}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/admin/login");
          return;
        }
        const json = (await res.json()) as { conversation?: ConversationData; error?: string };
        if (!res.ok || !json.conversation) {
          throw new Error(json.error ?? "No se pudo cargar la conversación.");
        }
        setData(json.conversation);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      });
  }, [convId, router]);

  // Scroll to bottom once messages load
  useEffect(() => {
    if (data) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.replace("/admin/login");
  }

  const userMsgs = data?.messages.filter((m) => m.role === "user").length ?? 0;
  const aiMsgs = data?.messages.filter((m) => m.role !== "user").length ?? 0;
  const displayName = data?.user?.name ?? data?.user?.email ?? "Usuario desconocido";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Left: breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/admin/users/${userId}`}
              className="shrink-0 flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Ficha</span>
            </Link>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 ring-1 ring-violet-500/30 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3 h-3 text-violet-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300 truncate max-w-64">
                {data?.title ?? "Cargando…"}
              </span>
            </div>
          </div>

          {/* Right: badges + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-400">
              <ShieldCheck className="w-3 h-3" />
              Admin
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="lg:w-72 shrink-0 space-y-4">

          {/* User card */}
          <div className="card-surface p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Usuario</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                {data?.user?.name && (
                  <p className="text-sm font-semibold text-white truncate">{data.user.name}</p>
                )}
                <p className="text-xs text-zinc-400 truncate">{data?.user?.email ?? "—"}</p>
              </div>
            </div>
            {data?.user?.id && (
              <Link
                href={`/admin/users/${data.user.id}`}
                className="block w-full text-center text-xs py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-violet-500/50 hover:text-violet-300 transition-all"
              >
                Ver ficha completa →
              </Link>
            )}
          </div>

          {/* Stats */}
          {!data ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="card-surface p-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Mensajes</p>
                <p className="text-2xl font-bold text-white">{data.messages.length}</p>
              </div>
              <div className="card-surface p-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Del usuario</p>
                <div className="flex items-end gap-1.5">
                  <p className="text-2xl font-bold text-violet-400">{userMsgs}</p>
                  <p className="text-xs text-zinc-600 mb-1">/ {aiMsgs} IA</p>
                </div>
              </div>

              <div className="card-surface p-3 space-y-1 col-span-2 lg:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Creada</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                  <p className="text-sm text-zinc-300">{fmtFull(data.createdAt)}</p>
                </div>
              </div>

              <div className="card-surface p-3 space-y-1 col-span-2 lg:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">ID</p>
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-zinc-600" />
                  <p className="text-xs font-mono text-zinc-500 truncate">{data.id}</p>
                </div>
              </div>

              {/* Rating */}
              {data.rating !== null && (
                <div className="card-surface p-3 space-y-1 col-span-2 lg:col-span-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Valoración</p>
                  <div className="flex items-center gap-2">
                    {data.rating === 1 ? (
                      <>
                        <ThumbsUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-emerald-400 font-medium">Útil</span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-4 h-4 text-rose-400" />
                        <span className="text-sm text-rose-400 font-medium">No útil</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {data.journalMode && (
                <div className="card-surface p-3 col-span-2 lg:col-span-1">
                  <span className="text-xs font-semibold text-amber-400">📓 Modo diario</span>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Chat thread ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="card-surface flex-1 flex flex-col overflow-hidden">

            {/* Thread header */}
            <div className="shrink-0 border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/15 ring-1 ring-violet-500/30 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">
                  {data?.title ?? "—"}
                </p>
                {data && (
                  <p className="text-xs text-zinc-500">
                    {data.messages.length} mensajes · última actividad {fmtDate(data.updatedAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">

              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              {!data && !error && (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                      {i % 2 === 0 && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
                      <Skeleton className={`h-14 ${i % 2 === 0 ? "w-64" : "w-48"}`} />
                      {i % 2 !== 0 && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
                    </div>
                  ))}
                </div>
              )}

              {data?.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 space-y-2 text-center">
                  <MessageSquare className="w-8 h-8 text-zinc-700" />
                  <p className="text-sm text-zinc-500">Sin mensajes en esta conversación.</p>
                </div>
              )}

              {data?.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const prev = idx > 0 ? data.messages[idx - 1] : null;
                const showDateSep = !prev || !sameDay(prev.createdAt, msg.createdAt);

                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDateSep && (
                      <div className="flex items-center gap-3 py-4">
                        <div className="flex-1 h-px bg-zinc-800" />
                        <span className="text-[11px] font-semibold text-zinc-600 shrink-0">
                          {fmtDate(msg.createdAt)}
                        </span>
                        <div className="flex-1 h-px bg-zinc-800" />
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                      {/* AI avatar */}
                      {!isUser && (
                        <div className="shrink-0 w-7 h-7 rounded-full bg-cyan-500/15 ring-1 ring-cyan-500/25 flex items-center justify-center mb-4">
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      )}

                      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
                        {/* Role label — only on first in a run */}
                        {(!prev || prev.role !== msg.role) && (
                          <span className="text-[11px] font-semibold text-zinc-600 px-1">
                            {isUser ? "Usuario" : "Luciérnaga"}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${
                            isUser
                              ? "bg-violet-600/25 border border-violet-500/40 text-white rounded-br-sm"
                              : "bg-zinc-800/80 border border-zinc-700/60 text-zinc-100 rounded-bl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-zinc-600 px-1">{fmtTime(msg.createdAt)}</span>
                      </div>

                      {/* User avatar */}
                      {isUser && (
                        <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 ring-1 ring-violet-500/30 flex items-center justify-center mb-4">
                          <User className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
