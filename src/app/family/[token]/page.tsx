"use client";

import { useEffect, useRef, useState } from "react";
import { use } from "react";
import {
  Heart,
  MessageCircle,
  Bell,
  TrendingUp,
  Target,
  Flame,
  Trophy,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type DashboardData = {
  userName: string;
  relation: string;
  lastSeenAt: string;
  progress?: {
    state: string;
    primaryEmotion: string | null;
    progressTrend: string;
    phase: string | null;
    goal: { title: string; total: number; completed: number } | null;
    emotionalLog: Array<{ date: string; state: string | null }>;
  };
  streak?: { current: number; best: number; status: string } | null;
  wins?: Array<{ note: string; date: string }>;
  unreadSupportMessages: number;
};

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  neutral: { label: "Estable", color: "bg-zinc-400" },
  claridad: { label: "Con claridad", color: "bg-emerald-500" },
  duda: { label: "Con dudas", color: "bg-yellow-400" },
  ansiedad: { label: "Ansioso/a", color: "bg-orange-400" },
  bloqueo: { label: "Bloqueado/a", color: "bg-red-400" },
};

const TREND_ICON: Record<string, string> = {
  mejor: "↑",
  igual: "→",
  peor: "↓",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)} días`;
}

export default function FamilyPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msgContent, setMsgContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/family/${token}/dashboard`)
      .then((r) => r.json())
      .then((res: { ok?: boolean; data?: DashboardData; error?: string }) => {
        if (res.ok && res.data) setData(res.data);
        else setError(res.error ?? "No se pudo cargar el portal.");
      })
      .catch(() => setError("Error de red. Inténtalo de nuevo."))
      .finally(() => setLoading(false));
  }, [token]);

  async function sendMessage() {
    if (!msgContent.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/family/${token}/support-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgContent.trim() }),
      });
      if (res.ok) {
        setSentMsg(true);
        setMsgContent("");
      }
    } finally {
      setSending(false);
    }
  }

  async function sendPing() {
    if (pinging || pinged) return;
    setPinging(true);
    setPingError(null);
    try {
      const res = await fetch(`/api/family/${token}/ping`, { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) setPinged(true);
      else setPingError(json.error ?? "No se pudo enviar.");
    } finally {
      setPinging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e10]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0e0e10] px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-semibold text-white">Enlace inválido</h1>
        <p className="text-sm text-zinc-400">
          {error ?? "Este portal no existe o el enlace ha caducado."}
        </p>
      </div>
    );
  }

  const stateInfo = STATE_LABELS[data.progress?.state ?? "neutral"] ?? STATE_LABELS.neutral;
  const trend = data.progress?.progressTrend ?? "igual";
  const goalProgress = data.progress?.goal
    ? Math.round((data.progress.goal.completed / Math.max(data.progress.goal.total, 1)) * 100)
    : null;

  return (
    <div className="min-h-screen bg-[#0e0e10] px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Portal de confianza · {data.relation}
              </p>
              <h1 className="mt-1 text-xl font-bold text-white">{data.userName}</h1>
              <p className="mt-1 text-xs text-zinc-500">
                Última actividad: {timeAgo(data.lastSeenAt)}
              </p>
            </div>
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
              <Heart className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Emotional state */}
        {data.progress && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-zinc-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Estado emocional
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${stateInfo.color}`} />
              <span className="text-base font-semibold text-white">{stateInfo.label}</span>
              <span className="ml-auto text-sm text-zinc-400">
                Tendencia {TREND_ICON[trend] ?? "→"}
              </span>
            </div>

            {/* Mini emotional heatmap - last 28 days */}
            {data.progress.emotionalLog.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] text-zinc-600">Últimos 28 días</p>
                <div className="flex flex-wrap gap-1">
                  {data.progress.emotionalLog.slice(-28).map((entry) => {
                    const s = STATE_LABELS[entry.state ?? "neutral"] ?? STATE_LABELS.neutral;
                    return (
                      <div
                        key={entry.date}
                        title={`${entry.date}: ${s.label}`}
                        className={`h-3 w-3 rounded-sm ${s.color} opacity-80`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {Object.entries(STATE_LABELS).map(([, v]) => (
                    <div key={v.label} className="flex items-center gap-1">
                      <div className={`h-2.5 w-2.5 rounded-sm ${v.color}`} />
                      <span className="text-[10px] text-zinc-600">{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active goal */}
        {data.progress?.goal && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-zinc-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Objetivo activo
              </p>
            </div>
            <p className="text-sm font-medium text-white">{data.progress.goal.title}</p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>
                  {data.progress.goal.completed} / {data.progress.goal.total} acciones
                </span>
                <span>{goalProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${goalProgress ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Streak */}
        {data.streak != null && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Racha</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{data.streak.current}</span>
              <span className="text-sm text-zinc-400">días seguidos</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">Mejor racha: {data.streak.best} días</p>
          </div>
        )}

        {/* Wins */}
        {data.wins && data.wins.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Victorias compartidas
              </p>
            </div>
            <div className="space-y-2">
              {data.wins.map((w, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5"
                >
                  <p className="text-sm text-zinc-200">&quot;{w.note}&quot;</p>
                  <p className="mt-1 text-[11px] text-zinc-600">{timeAgo(w.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send support message */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-zinc-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Enviar mensaje de apoyo
            </p>
          </div>

          {sentMsg ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Mensaje enviado. Lo verá en la app.
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                rows={3}
                maxLength={600}
                placeholder={`Escribe algo a ${data.userName}…`}
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-600">{msgContent.length}/600</span>
                <button
                  type="button"
                  disabled={!msgContent.trim() || sending}
                  onClick={() => void sendMessage()}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Enviar
                </button>
              </div>
            </>
          )}

          {sentMsg && (
            <button
              type="button"
              onClick={() => setSentMsg(false)}
              className="mt-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400"
            >
              <RefreshCw className="h-3 w-3" /> Enviar otro
            </button>
          )}
        </div>

        {/* Ping */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-zinc-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              ¿Estás bien?
            </p>
          </div>
          <p className="mb-4 text-sm text-zinc-400">
            Manda un ping discreto. {data.userName} recibirá una notificación y puede responderte
            desde la app.
          </p>
          {pinged ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Ping enviado. Le hemos notificado.
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={pinging}
                onClick={() => void sendPing()}
                className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-40"
              >
                {pinging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                Enviar ping silencioso
              </button>
              {pingError && <p className="mt-2 text-xs text-red-400">{pingError}</p>}
            </>
          )}
        </div>

        <p className="pb-4 text-center text-[11px] text-zinc-700">
          Este portal solo muestra lo que {data.userName} ha elegido compartir contigo. Las
          conversaciones siempre son privadas.
        </p>
      </div>
    </div>
  );
}
