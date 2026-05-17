"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Flame,
  Plus,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import type { UserState } from "@/domain/types";
import TuCamino from "@/components/TuCamino";
import RealityLens from "@/components/effects/RealityLens";

// Map locale → BCP47 para Intl.DateTimeFormat.
const LOCALE_BCP47: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
};

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

// Estilos visuales del estado emocional (estables); el label y desc se leen
// de messages.dashboard.state.<state> vía useTranslations.
const STATE_STYLE: Record<
  UserState,
  { emoji: string; gradient: string; border: string; badge: string }
> = {
  claridad: {
    emoji: "✨",
    gradient: "from-cyan-900/40 to-teal-900/20",
    border: "border-cyan-500/40",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  bloqueo: {
    emoji: "🧱",
    gradient: "from-red-900/30 to-rose-900/10",
    border: "border-red-500/30",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  ansiedad: {
    emoji: "⚡",
    gradient: "from-amber-900/30 to-orange-900/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  duda: {
    emoji: "🧭",
    gradient: "from-violet-900/30 to-purple-900/10",
    border: "border-violet-500/30",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  neutral: {
    emoji: "🌊",
    gradient: "from-zinc-800/40 to-zinc-900/20",
    border: "border-zinc-600/30",
    badge: "bg-zinc-700/40 text-zinc-300 border-zinc-600/30",
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
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const bcp = LOCALE_BCP47[locale] ?? "en-US";
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
  const style = STATE_STYLE[state];
  const stateLabel = t(`state.${state}.label`);
  const stateDesc = t(`state.${state}.desc`);
  const trend = stateData?.progressTrend ?? "igual";
  const TrendIcon = TREND_ICON[trend];
  const trendColor = TREND_COLOR[trend];
  const today = new Date().toLocaleDateString(bcp, {
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
            <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
            <p className="text-zinc-500 text-sm capitalize mt-0.5">{today}</p>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20 text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            {t("goToChat")}
          </Link>
        </div>

        {/* ── Metrics Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              {/* State */}
              <div className={`rounded-xl border bg-linear-to-br ${style.gradient} ${style.border} p-4 space-y-2`}>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{t("state.header")}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{style.emoji}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
                    {stateLabel}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-tight">{stateDesc}</p>
                <p className="text-[10px] text-zinc-600 leading-snug mt-1">{t("state.hint")}</p>
              </div>

              {/* Constancia — espejo, no meta */}
              <div className="card-surface p-4 space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{t("constancia.header")}</p>
                <p className="text-sm text-zinc-300 leading-snug">
                  {(stateData?.streakDays ?? 0) === 0
                    ? t("constancia.none")
                    : (stateData?.streakDays ?? 0) === 1
                    ? t("constancia.one")
                    : t("constancia.manyTpl", { n: stateData?.streakDays ?? 0 })}
                </p>
                <p className="text-[11px] text-zinc-600 leading-snug">{t("constancia.hint")}</p>
              </div>

              {/* Tendencia */}
              <div className="card-surface p-4 space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{t("trend.header")}</p>
                <div className="flex items-center gap-2">
                  <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                  <p className={`text-sm font-semibold capitalize ${trendColor}`}>
                    {t(`trend.labels.${trend}`)}
                  </p>
                </div>
                <p className="text-xs text-zinc-600">{stateData?.primaryEmotion ?? "—"}</p>
              </div>
            </>
          )}
        </div>

        {/* ── Reality Lens ──────────────────────────────────────────── */}
        {!loading && stateData && (
          <RealityLens
            surface={
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{t("lens.surfaceLabel")}</p>
                <p className="text-lg font-semibold text-white">{style.emoji} {stateLabel}</p>
                <p className="text-sm text-zinc-400">{stateDesc}</p>
              </div>
            }
            revealed={
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">{t("lens.revealedLabel")}</p>
                <p className="text-lg font-semibold text-cyan-300">{t(`lens.${stateData.state}`)}</p>
                <p className="text-xs text-violet-400/70">
                  {t("lens.metaTpl", { trend: t(`trend.labels.${stateData.progressTrend}`), n: stateData.streakDays })}
                </p>
              </div>
            }
          />
        )}

        {/* ── Main Grid ────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Left: Pending Actions */}
          <div className="md:col-span-2 space-y-6">
            <div className="card-surface p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-violet-400" />
                  <h2 className="font-bold text-white">{t("actions.title")}</h2>
                </div>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 hover:text-fuchsia-300 hover:border-fuchsia-500/40 hover:bg-violet-500/10 transition-all text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("actions.newInChat")}
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
                  <p className="text-zinc-400 text-sm">{t("actions.emptyTitle")}</p>
                  <p className="text-xs text-zinc-600">{t("actions.emptyHint")}</p>
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

            {/* Tu camino — hitos del journey, sin números ni metas */}
            <TuCamino />

            {/* Notas del usuario — momentos que él mismo eligió guardar */}
            <div className="card-surface p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-white">{t("wins.title")}</h2>
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
                  <p className="text-zinc-500 text-sm">{t("wins.emptyTitle")}</p>
                  <p className="text-xs text-zinc-600">{t("wins.emptyHint")}</p>
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
                          {new Date(win.createdAt).toLocaleDateString(bcp, {
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
                className={`rounded-xl border bg-linear-to-br ${style.gradient} ${style.border} p-5 space-y-4`}
              >
                <div className="text-4xl text-center">{style.emoji}</div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("card.emotionalLabel")}
                  </p>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${style.badge}`}
                  >
                    {stateLabel}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 text-center leading-relaxed">{stateDesc}</p>
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
                  {t("quick.openChat")}
                </span>
              </Link>
              <Link
                href="/impulso"
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition-all group"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  {t("quick.impulse")}
                </span>
              </Link>
              <Link
                href="/app/explore"
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  {t("quick.explore")}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
