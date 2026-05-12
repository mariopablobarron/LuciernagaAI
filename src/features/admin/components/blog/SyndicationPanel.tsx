"use client";

/**
 * Syndication panel — shows the publication status of a blog post across
 * external platforms (Medium, Dev.to, Hashnode) and offers manual retry.
 *
 * Rendered in /admin/blog/[id] for existing posts. Polls the backend on
 * mount and after every action.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type Platform = "medium" | "devto" | "hashnode";
const ALL_PLATFORMS: Platform[] = ["medium", "devto", "hashnode"];

type Syndication = {
  id: string;
  blogPostId: string;
  platform: Platform;
  status: "pending" | "success" | "failed" | "skipped";
  externalId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  attemptedAt: string;
  succeededAt: string | null;
};

const PLATFORM_LABELS: Record<Platform, string> = {
  medium: "Medium",
  devto: "Dev.to",
  hashnode: "Hashnode",
};

function statusIcon(s: Syndication["status"]) {
  switch (s) {
    case "success":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-rose-400" />;
    case "skipped":
      return <MinusCircle className="h-3.5 w-3.5 text-zinc-500" />;
    case "pending":
    default:
      return <Clock className="h-3.5 w-3.5 text-amber-400" />;
  }
}

function statusLabel(s: Syndication["status"]) {
  switch (s) {
    case "success":
      return "Publicado";
    case "failed":
      return "Fallo";
    case "skipped":
      return "Omitido";
    case "pending":
    default:
      return "Pendiente";
  }
}

export function SyndicationPanel({ postId, postStatus }: { postId: string; postStatus: string }) {
  const [rows, setRows] = useState<Syndication[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<Platform | "all" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}/syndicate`, { cache: "no-store", credentials: "include" });
      if (!res.ok) return;
      const json = (await res.json()) as { syndications: Syndication[] };
      setRows(json.syndications ?? []);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const trigger = useCallback(
    async (target: { platforms?: Platform[]; force?: boolean }) => {
      const tag: Platform | "all" = target.platforms?.length === 1 ? target.platforms[0]! : "all";
      setTriggering(tag);
      try {
        const res = await fetch(`/api/admin/blog/${postId}/syndicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(target),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(j.error ?? "Error al sindicar");
          return;
        }
        const j = (await res.json()) as { results: Array<{ platform: Platform; status: string; error?: string }> };
        for (const r of j.results) {
          if (r.status === "success") toast.success(`${PLATFORM_LABELS[r.platform]}: publicado`);
          else if (r.status === "skipped") toast.message(`${PLATFORM_LABELS[r.platform]}: omitido`, { description: r.error });
          else toast.error(`${PLATFORM_LABELS[r.platform]}: ${r.error ?? "fallo"}`);
        }
        await load();
      } finally {
        setTriggering(null);
      }
    },
    [postId, load],
  );

  const isPublished = postStatus === "published";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sindicación</label>
          <p className="text-[10px] text-zinc-600 mt-0.5">Re-publicación con canonical en plataformas externas</p>
        </div>
        <button
          type="button"
          onClick={() => void trigger({ platforms: ALL_PLATFORMS })}
          disabled={!isPublished || triggering !== null}
          className="text-xs px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/30 hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          title={!isPublished ? "Publica el post primero" : "Sindicar a todas las plataformas"}
        >
          {triggering === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Sindicar todo
        </button>
      </div>

      {!isPublished && (
        <p className="text-[11px] text-amber-400/80">
          La sindicación se dispara automáticamente cuando publicas el post. También puedes
          relanzarla aquí cuando esté publicado.
        </p>
      )}

      <div className="space-y-1.5">
        {loading ? (
          <div className="text-xs text-zinc-500 py-2">Cargando...</div>
        ) : (
          ALL_PLATFORMS.map((p) => {
            const row = rows.find((r) => r.platform === p);
            return (
              <div
                key={p}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-zinc-950/50 border border-zinc-800/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {statusIcon(row?.status ?? "pending")}
                  <span className="text-xs text-zinc-200 font-medium">{PLATFORM_LABELS[p]}</span>
                  <span className="text-[10px] text-zinc-500">{row ? statusLabel(row.status) : "Sin intentar"}</span>
                </div>
                <div className="flex items-center gap-1">
                  {row?.externalUrl && (
                    <a
                      href={row.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-500 hover:text-violet-300 flex items-center gap-0.5"
                      title={row.externalUrl}
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void trigger({ platforms: [p], force: row?.status === "success" })}
                    disabled={!isPublished || triggering !== null}
                    className="text-[10px] px-1.5 py-0.5 rounded text-zinc-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5"
                    title={row?.status === "success" ? "Re-publicar (force)" : "Reintentar"}
                  >
                    {triggering === p ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
                    {row?.status === "success" ? "force" : "reintentar"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {rows.some((r) => r.status === "failed" && r.errorMessage) && (
        <details className="text-[10px] text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-300">Ver últimos errores</summary>
          <div className="mt-1.5 space-y-1">
            {rows
              .filter((r) => r.status === "failed" && r.errorMessage)
              .map((r) => (
                <div key={r.id} className="px-2 py-1 rounded bg-rose-500/5 border border-rose-500/20">
                  <span className="text-rose-300 font-medium">{PLATFORM_LABELS[r.platform]}:</span>{" "}
                  <span className="text-zinc-400">{r.errorMessage}</span>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
