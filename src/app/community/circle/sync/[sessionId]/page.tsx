"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Clock, Users, Send, HeartHandshake, Lock } from "lucide-react";

type Response = {
  id: string;
  content: string;
  anonymous: boolean;
  authorName: string | null;
  submittedAt: string;
  echoCount: number;
  echoedByMe: boolean;
};

type SessionDetail = {
  id: string;
  circleId: string;
  circleName: string;
  prompt: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
  scheduledFor: string;
  openedAt: string | null;
  closedAt: string | null;
  msRemaining: number | null;
  myResponse: {
    id: string;
    content: string;
    anonymous: boolean;
    submittedAt: string;
    editedAt: string | null;
  } | null;
  responses: Response[];
  echoQuotaRemaining: number;
};

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export default function CircleSyncSessionPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [echoBusy, setEchoBusy] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/circle/sync/${sessionId}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        toast.error("No eres miembro de este círculo");
        router.replace("/community/cafeteria");
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as { session: SessionDetail };
      setSession(json.session);
      if (json.session.myResponse && !draft) {
        setDraft(json.session.myResponse.content);
        setAnonymous(json.session.myResponse.anonymous);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Live polling every 8s while session is active
  useEffect(() => {
    if (session?.status !== "active") return;
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [session?.status, load]);

  // Countdown tick every second
  useEffect(() => {
    if (session?.status !== "active") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session?.status]);

  const msRemaining = useMemo(() => {
    if (!session?.openedAt || session.status !== "active") return null;
    const end = new Date(session.openedAt).getTime() + 30 * 60 * 1000;
    return Math.max(0, end - now);
  }, [session?.openedAt, session?.status, now]);

  async function submit() {
    if (!draft.trim() || submitting || !session) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/community/circle/sync/${sessionId}/respond`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draft, anonymous }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        heldForReview?: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Error al publicar");
        return;
      }
      if (json.heldForReview) {
        toast.info(
          "Tu mensaje está en revisión por el equipo clínico. No se ha publicado al círculo.",
        );
      } else {
        toast.success(session.myResponse ? "Actualizado" : "Publicado");
      }
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEcho(responseId: string) {
    if (echoBusy || !session) return;
    setEchoBusy(responseId);
    try {
      const res = await fetch(
        `/api/community/circle/sync/${sessionId}/echo`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responseId }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        remaining?: number;
      };
      if (!res.ok) {
        const msg =
          json.error === "quota_exceeded"
            ? "Has usado tus 5 'te escucho' de hoy. Vuelven en 24h."
            : json.error === "already_echoed"
              ? "Ya le has escuchado"
              : json.error ?? "Error";
        toast.error(msg);
        return;
      }
      await load();
    } finally {
      setEchoBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
        <p className="text-sm text-zinc-500">Sesión no encontrada.</p>
      </div>
    );
  }

  const isActive = session.status === "active";
  const isScheduled = session.status === "scheduled";
  const isEnded = session.status === "ended" || session.status === "cancelled";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">
              Círculo: {session.circleName}
            </p>
            {isActive && msRemaining !== null && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Clock className="h-3 w-3" />
                {formatCountdown(msRemaining)}
              </div>
            )}
            {isScheduled && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Clock className="h-3 w-3" />
                Abre {new Date(session.scheduledFor).toLocaleString("es-ES")}
              </span>
            )}
            {isEnded && (
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
                <Lock className="h-3 w-3" />
                Cerrada
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold leading-snug text-white sm:text-2xl">
            {session.prompt}
          </h1>
          <p className="text-xs text-zinc-500">
            Escribe tu reflexión. Vas a ver aparecer las de tus compañeros en vivo. Sin chat, sin comentarios.
          </p>
        </div>

        {/* My response area */}
        {(isActive || isScheduled) && (
          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Tu respuesta
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
              disabled={!isActive || submitting}
              placeholder={
                isScheduled
                  ? "Podrás escribir cuando se abra la sesión."
                  : "Escribe sin rodeos. Solo te leerá el círculo."
              }
              rows={5}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  disabled={!isActive}
                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500"
                />
                {anonymous ? "Anónimo" : "Con mi nombre"}
              </label>
              <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                <span>{draft.length}/2000</span>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!isActive || !draft.trim() || submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  {session.myResponse ? "Actualizar" : "Publicar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Echo quota counter */}
        {(isActive || isEnded) && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
            <span className="text-xs text-zinc-400">
              <Users className="mr-1 inline h-3 w-3" />
              {session.responses.length} personas han escrito
            </span>
            <span className="text-xs text-zinc-400">
              <HeartHandshake className="mr-1 inline h-3 w-3 text-rose-400" />
              {session.echoQuotaRemaining}/5 &quot;te escucho&quot; hoy
            </span>
          </div>
        )}

        {/* Peer responses */}
        <div className="space-y-3">
          {session.responses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
              <p className="text-sm text-zinc-500">
                {isActive
                  ? "Sé la primera persona en escribir. Los demás lo verán y se unirán."
                  : isScheduled
                    ? "La sesión aún no ha empezado."
                    : "Nadie del círculo escribió esta sesión."}
              </p>
            </div>
          ) : (
            session.responses.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400">
                    {r.anonymous
                      ? "Alguien del círculo"
                      : r.authorName ?? "Alguien del círculo"}
                  </span>
                  <span className="text-zinc-600">
                    {formatRelativeTime(r.submittedAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap">
                  {r.content}
                </p>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => toggleEcho(r.id)}
                    disabled={
                      echoBusy === r.id ||
                      r.echoedByMe ||
                      session.echoQuotaRemaining === 0
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                      r.echoedByMe
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-50"
                    }`}
                    aria-label={r.echoedByMe ? "Ya escuchaste" : "Te escucho"}
                  >
                    <HeartHandshake className="h-3 w-3" />
                    {r.echoedByMe ? "Te escuché" : "Te escucho"}
                    {r.echoCount > 0 && (
                      <span className="text-zinc-500">· {r.echoCount}</span>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer note */}
        {isActive && (
          <p className="text-center text-[11px] text-zinc-600 italic">
            Nadie fuera de tu círculo lee esto. La sesión se cierra en {msRemaining !== null ? formatCountdown(msRemaining) : "..."}.
          </p>
        )}
        {isEnded && (
          <p className="text-center text-[11px] text-zinc-600 italic">
            Esta sesión quedó archivada. Puedes escuchar respuestas durante 24h tras el cierre.
          </p>
        )}
      </div>
    </div>
  );
}
