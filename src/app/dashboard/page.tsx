"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Plus,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import type { UserState } from "@/domain/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingAction = { id: string; description: string };

type StateData = {
  state: UserState;
  primaryEmotion: string;
  progressTrend: "subiendo" | "bajando" | "igual";
  streakDays: number;
  progress: number;
  pendingActions: PendingAction[];
};

type Win = { id: string; note: string; createdAt: string };

// ─── Config ──────────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<
  UserState,
  { label: string; emoji: string; gradient: string; border: string; badge: string; desc: string }
> = {
  claridad: {
    label: "Claridad",
    emoji: "✨",
    gradient: "from-cyan-900/40 to-teal-900/20",
    border: "border-cyan-500/40",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    desc: "Latido en dirección. Aprovecha este impulso ahora.",
  },
  bloqueo: {
    label: "Bloqueo",
    emoji: "🧱",
    gradient: "from-red-900/30 to-rose-900/10",
    border: "border-red-500/30",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
    desc: "Latido pausado. Nombrarlo desbloquea el ritmo.",
  },
  ansiedad: {
    label: "Ansiedad",
    emoji: "⚡",
    gradient: "from-amber-900/30 to-orange-900/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    desc: "Demasiados latidos a la vez. Elige uno solo.",
  },
  duda: {
    label: "Duda",
    emoji: "🧭",
    gradient: "from-violet-900/30 to-purple-900/10",
    border: "border-violet-500/30",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    desc: "El latido busca ritmo. El chat puede orientarlo.",
  },
  neutral: {
    label: "Neutral",
    emoji: "🌊",
    gradient: "from-zinc-800/40 to-zinc-900/20",
    border: "border-zinc-600/30",
    badge: "bg-zinc-700/40 text-zinc-300 border-zinc-600/30",
    desc: "Latido en calma. Buen momento para elegir dirección.",
  },
};

const TREND_ICON = {
  subiendo: TrendingUp,
  bajando: TrendingDown,
  igual: Minus,
};

const TREND_COLOR = {
  subiendo: "text-emerald-400",
  bajando: "text-red-400",
  igual: "text-zinc-400",
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-xl ${className ?? ""}`} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [stateRes, winsRes] = await Promise.all([
          fetch("/api/user/state", { credentials: "include" }),
          fetch("/api/user/wins", { credentials: "include" }),
        ]);

        if (cancelled) return;

        const stateJson = stateRes.ok
          ? ((await stateRes.json()) as { success: boolean } & StateData)
          : null;

        const winsJson = winsRes.ok
          ? ((await winsRes.json()) as { wins: Win[] })
          : null;

        if (!cancelled) {
          if (stateJson?.success) {
            setStateData({
              state: stateJson.state ?? "neutral",
              primaryEmotion: stateJson.primaryEmotion ?? "calma",
              progressTrend: stateJson.progressTrend ?? "igual",
              streakDays: stateJson.streakDays ?? 0,
              progress: stateJson.progress ?? 0,
              pendingActions: stateJson.pendingActions ?? [],
            });
          }
          setWins(winsJson?.wins?.slice(0, 5) ?? []);
        }
      } catch {
        // silently degrade
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const state = stateData?.state ?? "neutral";
  const cfg = STATE_CONFIG[state];
  const TrendIcon = TREND_ICON[stateData?.progressTrend ?? "igual"];
  const trendColor = TREND_COLOR[stateData?.progressTrend ?? "igual"];
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="bg-zinc-950">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-fuchsia-500/6 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Tu progreso</h1>
            <p className="text-zinc-500 text-sm capitalize mt-0.5">{today}</p>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20 text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Ir al chat
          </Link>
        </div>

        {/* ── Metrics Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              {/* State */}
              <div className={`rounded-xl border bg-linear-to-br ${cfg.gradient} ${cfg.border} p-4 space-y-2`}>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Estado</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cfg.emoji}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-tight">{cfg.desc}</p>
              </div>

              {/* Streak ring */}
              <div className="card-surface p-4 space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Racha</p>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 shrink-0">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#27272a" strokeWidth="4" />
                      <circle
                        cx="24" cy="24" r="20" fill="none"
                        stroke="url(#streakGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min((stateData?.streakDays ?? 0), 21) / 21)}`}
                        className="transition-all duration-700"
                      />
                      <defs>
                        <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{stateData?.streakDays ?? 0}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{stateData?.streakDays ?? 0} días</p>
                    <p className="text-xs text-zinc-600">meta: 21</p>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="card-surface p-4 space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Progreso</p>
                <p className="text-2xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {stateData?.progress ?? 0}%
                </p>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-all"
                    style={{ width: `${stateData?.progress ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Trend */}
              <div className="card-surface p-4 space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Tendencia</p>
                <div className="flex items-center gap-2">
                  <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                  <p className={`text-sm font-semibold capitalize ${trendColor}`}>
                    {stateData?.progressTrend ?? "igual"}
                  </p>
                </div>
                <p className="text-xs text-zinc-600">{stateData?.primaryEmotion ?? "—"}</p>
              </div>
            </>
          )}
        </div>

        {/* ── Main Grid ────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Left: Pending Actions */}
          <div className="md:col-span-2 space-y-6">
            <div className="card-surface p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-violet-400" />
                  <h2 className="font-bold text-white">Acciones pendientes</h2>
                </div>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 hover:text-fuchsia-300 hover:border-fuchsia-500/40 hover:bg-violet-500/10 transition-all text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nueva en chat
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : (stateData?.pendingActions ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-8 space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                  <p className="text-zinc-400 text-sm">Sin acciones pendientes.</p>
                  <p className="text-xs text-zinc-600">
                    Conversa con Tres Mil Millones de Latidos para definir tu próxima acción.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stateData!.pendingActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors group"
                    >
                      <Circle className="w-4 h-4 text-zinc-700 group-hover:text-violet-500 transition-colors mt-0.5 shrink-0" />
                      <p className="text-sm text-zinc-300 leading-snug">{action.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Wins */}
            <div className="card-surface p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-white">Logros recientes</h2>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : wins.length === 0 ? (
                <div className="flex flex-col items-center py-6 space-y-2 text-center">
                  <Sparkles className="w-7 h-7 text-amber-500/30" />
                  <p className="text-zinc-500 text-sm">Aún no has registrado logros.</p>
                  <p className="text-xs text-zinc-600">Cuéntale a Tres Mil Millones de Latidos cuando completes algo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {wins.map((win) => (
                    <div
                      key={win.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-amber-500/5"
                    >
                      <span className="text-amber-400 text-sm shrink-0 mt-0.5">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300 leading-snug">{win.note}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {new Date(win.createdAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: State Card + CTAs */}
          <div className="space-y-5">
            {/* Emotional Card */}
            {loading ? (
              <Skeleton className="h-44" />
            ) : (
              <div
                className={`rounded-xl border bg-linear-to-br ${cfg.gradient} ${cfg.border} p-5 space-y-4`}
              >
                <div className="text-4xl text-center">{cfg.emoji}</div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Estado emocional
                  </p>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 text-center leading-relaxed">{cfg.desc}</p>
              </div>
            )}

            {/* Quick links */}
            <div className="space-y-2">
              <Link
                href="/app"
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
              >
                <MessageCircle className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  Abrir chat
                </span>
              </Link>
              <Link
                href="/impulso"
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition-all group"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  Programa Impulso
                </span>
              </Link>
              <Link
                href="/app/explore"
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  Explorar ahora
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
