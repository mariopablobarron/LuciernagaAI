"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Loader2, Check, X, ExternalLink, Copy, Send, Edit3, RefreshCw, Zap, Link2 } from "lucide-react";
import { toast } from "sonner";

type Match = {
  id: string;
  platform: string;
  externalId: string;
  externalUrl: string;
  subredditOrTag: string | null;
  title: string | null;
  excerpt: string | null;
  authorHandle: string | null;
  postedAt: string | null;
  matchedKeywords: string[];
  llmScore: number | null;
  llmReason: string | null;
  draftResponse: string | null;
  status: "pending" | "approved" | "rejected" | "published" | "failed";
  approvedAt: string | null;
  publishedAt: string | null;
  publishedUrl: string | null;
  createdAt: string;
};

type Stats = Record<string, number>;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendientes",
  approved: "Aprobados",
  rejected: "Rechazados",
  published: "Publicados",
  all: "Todos",
};

function scoreClass(score: number | null): string {
  if (score === null) return "bg-zinc-700 text-zinc-300";
  if (score >= 9) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (score >= 7) return "bg-violet-500/20 text-violet-300 border-violet-500/30";
  if (score >= 5) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-zinc-700/40 text-zinc-400 border-zinc-700";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.floor(ms / 60_000)} min`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type RedditStatus = {
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  hasCredentials: boolean;
};

export default function DistributionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>("");
  const [reddit, setReddit] = useState<RedditStatus | null>(null);

  // Mostrar toast tras callback OAuth
  useEffect(() => {
    const r = searchParams.get("reddit");
    if (r === "connected") toast.success("Reddit conectado");
    else if (r === "denied") toast.error("Conexión a Reddit cancelada");
    else if (r === "state_error") toast.error("Error de estado OAuth — reintenta");
    else if (r === "exchange_failed") toast.error("Falló el intercambio de token con Reddit");
  }, [searchParams]);

  const loadRedditStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/distribution/reddit-status", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return;
      setReddit((await res.json()) as RedditStatus);
    } catch {}
  }, []);

  useEffect(() => {
    void loadRedditStatus();
  }, [loadRedditStatus]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.push("/admin/login");
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/distribution?status=${filter}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { matches: Match[]; stats: Stats };
      setMatches(json.matches);
      setStats(json.stats);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const performAction = useCallback(
    async (id: string, action: string, payload: Record<string, unknown> = {}) => {
      setActioningId(id);
      try {
        const res = await fetch(`/api/admin/distribution/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action, ...payload }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(j.error ?? "Error");
          return;
        }
        toast.success(action === "approve" ? "Aprobado" : action === "reject" ? "Rechazado" : action === "publish" ? "Marcado como publicado" : "Actualizado");
        setEditingId(null);
        await load();
      } finally {
        setActioningId(null);
      }
    },
    [load],
  );

  const copyDraft = useCallback((draft: string) => {
    void navigator.clipboard.writeText(draft);
    toast.success("Borrador copiado al portapapeles");
  }, []);

  return (
    <AdminShell
      title="Discovery & Distribution"
      subtitle="Conversaciones en foros donde tu producto aporta valor real."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Reddit connection banner */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link2 className={`h-4 w-4 ${reddit?.connected ? "text-emerald-400" : "text-zinc-500"}`} />
            <div className="text-xs">
              {reddit === null ? (
                <span className="text-zinc-500">Comprobando estado de Reddit…</span>
              ) : reddit.connected ? (
                <span className="text-zinc-300">
                  Reddit conectado como{" "}
                  <span className="text-emerald-300 font-medium">u/{reddit.username ?? "—"}</span>{" "}
                  · Auto-publish activo
                </span>
              ) : !reddit.hasCredentials ? (
                <span className="text-amber-400">
                  Falta configurar Reddit OAuth (REDDIT_USER_CLIENT_ID / SECRET).
                </span>
              ) : (
                <span className="text-zinc-400">
                  Reddit no conectado. Aprueba con flujo manual o conecta para auto-publish.
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reddit?.hasCredentials && !reddit.connected && (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- endpoint API (route handler OAuth), no una página: <Link> rompería el redirect 302
              <a
                href="/api/admin/distribution/reddit-oauth-start"
                className="text-xs px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 flex items-center gap-1.5"
              >
                <Zap className="h-3 w-3" /> Conectar Reddit
              </a>
            )}
            {reddit?.connected && (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- endpoint API (route handler OAuth), no una página: <Link> rompería el redirect 302
              <a
                href="/api/admin/distribution/reddit-oauth-start"
                className="text-[10px] px-2 py-0.5 rounded text-zinc-500 hover:text-orange-300"
                title="Re-autorizar (si cambias de cuenta)"
              >
                re-conectar
              </a>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1.5"
            >
              <RefreshCw className="h-3 w-3" /> Refrescar
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          {Object.keys(STATUS_LABELS).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition ${
                filter === s
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {STATUS_LABELS[s]}
              {stats[s] != null && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {stats[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500 mx-auto" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No hay matches en este estado.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border ${scoreClass(m.llmScore)}`}
                      >
                        {m.llmScore ?? "—"}/10
                      </span>
                      <span className="text-xs text-zinc-500">{m.subredditOrTag}</span>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-600">{timeAgo(m.postedAt)}</span>
                      {m.authorHandle && (
                        <>
                          <span className="text-[10px] text-zinc-600">·</span>
                          <span className="text-[10px] text-zinc-500">u/{m.authorHandle}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-zinc-100 leading-snug">{m.title}</h3>
                    <a
                      href={m.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Abrir hilo original
                    </a>
                  </div>
                </div>

                {/* Excerpt */}
                {m.excerpt && (
                  <div className="text-xs text-zinc-400 bg-zinc-950/50 rounded-md p-3 border border-zinc-800/50 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {m.excerpt}
                  </div>
                )}

                {/* LLM reason */}
                {m.llmReason && (
                  <div className="text-[10px] text-zinc-500 italic px-1">
                    <span className="font-medium text-zinc-400">Razonamiento:</span> {m.llmReason}
                  </div>
                )}

                {/* Draft */}
                {m.draftResponse && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                      <span>Borrador</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyDraft(m.draftResponse!)}
                          className="text-zinc-500 hover:text-violet-300 flex items-center gap-1"
                        >
                          <Copy className="h-2.5 w-2.5" /> copiar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditDraft(m.draftResponse ?? "");
                          }}
                          className="text-zinc-500 hover:text-violet-300 flex items-center gap-1"
                        >
                          <Edit3 className="h-2.5 w-2.5" /> editar
                        </button>
                      </div>
                    </div>
                    {editingId === m.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={6}
                          className="w-full rounded-md border border-violet-500/30 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 focus:border-violet-500/60 focus:outline-none resize-y leading-relaxed"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={actioningId === m.id}
                            onClick={() => void performAction(m.id, "edit", { draftResponse: editDraft })}
                            className="text-[10px] px-2 py-1 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-200 bg-violet-500/5 border border-violet-500/20 rounded-md p-3 leading-relaxed whitespace-pre-wrap">
                        {m.draftResponse}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {m.status === "pending" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50 flex-wrap">
                    <button
                      type="button"
                      disabled={actioningId === m.id}
                      onClick={() => void performAction(m.id, "approve")}
                      className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="h-3 w-3" /> Aprobar
                    </button>
                    {reddit?.connected && m.platform === "reddit" && m.draftResponse && (
                      <button
                        type="button"
                        disabled={actioningId === m.id}
                        onClick={() => {
                          if (confirm("¿Publicar el borrador en Reddit ahora con tu cuenta?")) {
                            void performAction(m.id, "auto-publish");
                          }
                        }}
                        className="text-xs px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-1.5"
                        title="Publicar el draft directamente con tu cuenta Reddit (no necesita copy-paste)"
                      >
                        <Zap className="h-3 w-3" /> Auto-publicar
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={actioningId === m.id}
                      onClick={() => void performAction(m.id, "reject")}
                      className="text-xs px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X className="h-3 w-3" /> Rechazar
                    </button>
                  </div>
                )}

                {m.status === "approved" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50 flex-wrap">
                    {reddit?.connected && m.platform === "reddit" && (
                      <button
                        type="button"
                        disabled={actioningId === m.id}
                        onClick={() => {
                          if (confirm("¿Publicar el borrador en Reddit ahora con tu cuenta?")) {
                            void performAction(m.id, "auto-publish");
                          }
                        }}
                        className="text-xs px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Zap className="h-3 w-3" /> Auto-publicar ahora
                      </button>
                    )}
                    <div className="text-[10px] text-emerald-400 px-1">
                      {reddit?.connected && m.platform === "reddit"
                        ? "Aprobado. Auto-publica o pega URL manual:"
                        : "Aprobado. Publica manualmente y pega la URL:"}
                    </div>
                    <PublishForm matchId={m.id} onPublished={() => void load()} />
                  </div>
                )}

                {m.status === "failed" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50 flex-wrap">
                    <div className="text-[10px] text-rose-400 px-1">
                      Fallo al publicar. Reintenta o publica manualmente.
                    </div>
                    {reddit?.connected && m.platform === "reddit" && (
                      <button
                        type="button"
                        disabled={actioningId === m.id}
                        onClick={() => void performAction(m.id, "auto-publish")}
                        className="text-xs px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <RefreshCw className="h-3 w-3" /> Reintentar
                      </button>
                    )}
                    <PublishForm matchId={m.id} onPublished={() => void load()} />
                  </div>
                )}

                {m.status === "published" && m.publishedUrl && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                    <a
                      href={m.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver respuesta publicada
                    </a>
                    {m.publishedAt && (
                      <span className="text-[10px] text-zinc-500">· hace {timeAgo(m.publishedAt)}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function PublishForm({ matchId, onPublished }: { matchId: string; onPublished: () => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = useCallback(async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/distribution/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "publish", publishedUrl: url.trim() }),
      });
      if (res.ok) {
        toast.success("Marcado como publicado");
        onPublished();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Error");
      }
    } finally {
      setBusy(false);
    }
  }, [matchId, url, onPublished]);
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://reddit.com/r/.../comments/.../..."
        className="flex-1 text-xs px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none"
      />
      <button
        type="button"
        disabled={busy || !url.trim()}
        onClick={() => void submit()}
        className="text-xs px-2 py-1 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 disabled:opacity-50 flex items-center gap-1"
      >
        <Send className="h-3 w-3" /> Marcar
      </button>
    </div>
  );
}
