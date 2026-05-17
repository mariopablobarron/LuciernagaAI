"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Flame,
  Zap,
  TrendingUp,
  Lock,
  CheckCircle2,
  Target,
  Brain,
  Users,
  Dumbbell,
  BarChart3,
  CalendarDays,
  Trophy,
} from "lucide-react";
import type {
  ImpulseProfileSnapshot,
  StreakSnapshot,
  DailyImpulseLogSnapshot,
  ImpulseInsight,
  ImpulseProfileCode,
  ChallengeType,
} from "@/types/impulse";

// ─── Types ──────────────────────────────────────────────────────────────────

type ChallengeSnapshot = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ChallengeType;
  status: string;
  progress: number;
  completedDays: number;
  totalDays: number;
  startedAt: string;
};

type InsightsData = {
  profile: ImpulseProfileSnapshot | null;
  streak: StreakSnapshot | null;
  logs: DailyImpulseLogSnapshot[];
  insights: ImpulseInsight[];
  challenges?: ChallengeSnapshot[];
};

// ─── Config Maps ─────────────────────────────────────────────────────────────

// Estilo visual estable; emoji es universal por código
const PROFILE_STYLE: Record<
  ImpulseProfileCode,
  { emoji: string; gradient: string; border: string; badge: string }
> = {
  POTENCIAL_ALTO: {
    emoji: "🚀",
    gradient: "from-cyan-900/40 to-violet-900/30",
    border: "border-cyan-500/40",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  BLOQUEADO: {
    emoji: "🧱",
    gradient: "from-red-900/40 to-rose-900/20",
    border: "border-red-500/40",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  ANSIOSO: {
    emoji: "⚡",
    gradient: "from-amber-900/40 to-orange-900/20",
    border: "border-amber-500/40",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  DESMOTIVADO: {
    emoji: "🌫️",
    gradient: "from-zinc-900/60 to-zinc-800/30",
    border: "border-zinc-600/40",
    badge: "bg-zinc-700/40 text-zinc-300 border-zinc-600/30",
  },
  PERDIDO: {
    emoji: "🧭",
    gradient: "from-violet-900/40 to-purple-900/20",
    border: "border-violet-500/40",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
};

const CHALLENGE_ICON: Record<ChallengeType, React.ElementType> = {
  claridad: Target,
  energia: Zap,
  disciplina: Dumbbell,
  social: Users,
  ejecucion: BarChart3,
};

const CHALLENGE_COLOR: Record<ChallengeType, string> = {
  claridad: "text-cyan-400",
  energia: "text-amber-400",
  disciplina: "text-violet-400",
  social: "text-fuchsia-400",
  ejecucion: "text-emerald-400",
};

const CHALLENGE_BAR: Record<ChallengeType, string> = {
  claridad: "from-cyan-500 to-teal-400",
  energia: "from-amber-500 to-orange-400",
  disciplina: "from-violet-500 to-fuchsia-400",
  social: "from-fuchsia-500 to-pink-400",
  ejecucion: "from-emerald-500 to-cyan-400",
};

// ─── Tab type ─────────────────────────────────────────────────────────────────

type TabId = "diagnostico" | "retos" | "insights" | "mensajes";

const TAB_IDS: TabId[] = ["diagnostico", "retos", "insights", "mensajes"];

const TAB_ICONS: Record<TabId, React.ElementType> = {
  diagnostico: Brain,
  retos: Target,
  insights: Zap,
  mensajes: CalendarDays,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className ?? ""}`} />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ImpulsoPage() {
  const t = useTranslations("impulso.page");
  const [activeTab, setActiveTab] = useState<TabId>("diagnostico");
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [insightsRes, challengeRes] = await Promise.all([
          fetch("/api/insights", { credentials: "include" }),
          fetch("/api/challenge", { credentials: "include" }).catch(() => null),
        ]);

        if (cancelled) return;

        const insightsJson = insightsRes.ok
          ? ((await insightsRes.json()) as { success: boolean } & InsightsData)
          : null;

        const challengeJson =
          challengeRes?.ok
            ? ((await challengeRes.json()) as { challenges?: ChallengeSnapshot[] })
            : null;

        if (!cancelled) {
          setData({
            profile: insightsJson?.profile ?? null,
            streak: insightsJson?.streak ?? null,
            logs: insightsJson?.logs ?? [],
            insights: insightsJson?.insights ?? [],
            challenges: challengeJson?.challenges ?? [],
          });
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const profile = data?.profile ?? null;
  const streak = data?.streak ?? null;
  const profileStyle = profile
    ? PROFILE_STYLE[profile.code]
    : PROFILE_STYLE.POTENCIAL_ALTO;

  // Derive program days from streak
  const programDays = streak?.currentDays ?? 0;
  const programTotal = 21;
  const programProgress = Math.min(Math.round((programDays / programTotal) * 100), 100);

  // Not started: show onboarding screen
  const notStarted = !loading && !error && !profile;

  return (
    <div className="bg-zinc-950">
      {/* Background glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-125 h-125 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-100 h-100 bg-fuchsia-500/8 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* ── Welcome screen (first time) ────────────────────────── */}
        {notStarted && (
          <div className="max-w-2xl mx-auto space-y-8 py-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
                <Zap className="w-10 h-10 text-violet-400" />
              </div>
              <h1 className="text-4xl font-black text-white">{t("welcomeTitle")}</h1>
              <p className="text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
                {t("welcomeSubtitle")}
              </p>
            </div>

            {/* Why 21 days */}
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-white">{t("why21Title")}</h2>
              <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
                <p>
                  {t.rich("why21P1", {
                    strong: (c) => <strong className="text-white">{c}</strong>,
                  })}
                </p>
                <p>
                  {t.rich("why21P2", {
                    strong: (c) => <strong className="text-white">{c}</strong>,
                  })}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <p className="text-2xl font-black text-cyan-400">7</p>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">{t("cycle1Title")}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{t("cycle1Desc")}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <p className="text-2xl font-black text-violet-400">14</p>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">{t("cycle2Title")}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{t("cycle2Desc")}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <p className="text-2xl font-black text-fuchsia-400">21</p>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">{t("cycle3Title")}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{t("cycle3Desc")}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 italic">{t("why21Note")}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "diagnostic", icon: Brain, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
                { key: "challenges", icon: Target, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                { key: "checkin", icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                { key: "insights", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              ].map((item) => (
                <div key={item.key} className={`rounded-xl border ${item.border} ${item.bg} p-5 space-y-2`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                  <p className="text-sm font-bold text-white">{t(`pillar.${item.key}.title`)}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{t(`pillar.${item.key}.desc`)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <p className="text-sm font-semibold text-white">{t("howTitle")}</p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300">{n}</span>
                    <p className="text-sm text-zinc-400 leading-relaxed">{t(`howStep${n}`)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center space-y-3">
              <Link
                href="/impulso/diagnóstico"
                data-tour="impulso-diagnóstico"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-lg shadow-xl shadow-fuchsia-500/25 hover:from-violet-400 hover:to-fuchsia-400 active:scale-95 transition-all"
              >
                <Brain className="w-5 h-5" /> {t("startDiagnosticCta")}
              </Link>
              <p className="text-xs text-zinc-600">{t("startDiagnosticHint")}</p>
            </div>
          </div>
        )}

        {/* ── Header (only when started) ─────────────────────────── */}
        {!notStarted && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1">
              {t("programLabel")}
            </p>
            <h1 className="text-3xl font-bold text-white">{t("programTitle")}</h1>
            <p className="text-zinc-400 text-sm mt-1">{t("programSubtitle")}</p>
          </div>
          <Link
            href="/impulso/checkin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40 text-sm"
          >
            <Flame className="w-4 h-4" />
            {t("checkinToday")}
          </Link>
        </div>
        )}

        {!notStarted && <>
        {/* ── Stats Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              {/* Streak ring */}
              <div className="card-surface p-5 flex flex-col items-center space-y-2">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="23" fill="none" stroke="#27272a" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r="23" fill="none"
                      stroke="url(#impulsoStreakGrad)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 23}`}
                      strokeDashoffset={`${2 * Math.PI * 23 * (1 - Math.min((streak?.currentDays ?? 0), 21) / 21)}`}
                      className="transition-all duration-700"
                    />
                    <defs>
                      <linearGradient id="impulsoStreakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{streak?.currentDays ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">{t("daysInARow")}</p>
                {streak?.bestDays ? (
                  <p className="text-xs text-zinc-600">{t("bestStreak", { days: streak.bestDays })}</p>
                ) : null}
              </div>

              {/* Progress */}
              <div className="card-surface p-5 text-center space-y-2">
                <p className="text-2xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {programProgress}%
                </p>
                <p className="text-xs text-zinc-400">{t("programProgress")}</p>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-all"
                    style={{ width: `${programProgress}%` }}
                  />
                </div>
              </div>

              {/* Days */}
              <div className="card-surface p-5 text-center space-y-1.5">
                <p className="text-2xl font-bold text-white">
                  {programDays}/{programTotal}
                </p>
                <p className="text-xs text-zinc-400">{t("daysCompleted")}</p>
                {programDays >= programTotal ? (
                  <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3" /> {t("completed")}
                  </p>
                ) : programProgress >= 40 ? (
                  <p className="text-xs text-cyan-400 font-semibold">{t("onTrack")}</p>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* ── Tab Navigation ─────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-zinc-800/80 overflow-x-auto scrollbar-none">
          {TAB_IDS.map((tabId) => {
            const Icon = TAB_ICONS[tabId];
            const active = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  active
                    ? "text-white border-b-violet-500"
                    : "text-zinc-500 border-b-transparent hover:text-zinc-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(`tabs.${tabId}`)}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ────────────────────────────────────────── */}

        {/* DIAGNÓSTICO */}
        {activeTab === "diagnostico" && (
          <div className="space-y-6">
            {loading ? (
              <>
                <Skeleton className="h-48" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              </>
            ) : error || !profile ? (
              <div className="space-y-6">
                <div className="relative rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 sm:p-10 text-center overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                    <span className="text-3xl">⚡</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {t("noProfileTitle")}
                  </h2>
                  <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto mb-8">
                    {t("noProfileDesc")}
                  </p>
                  <Link
                    href="/impulso/diagnóstico"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20 text-base"
                  >
                    <Brain className="w-4 h-4" />
                    {t("doDiagnosticNow")}
                  </Link>
                  <p className="text-xs text-zinc-600 mt-4">{t("doDiagnosticHint")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { num: "01", key: "diagnostic", icon: Brain, color: "text-violet-400", bg: "bg-violet-500/10" },
                    { num: "02", key: "profile", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { num: "03", key: "challenges", icon: Target, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                  ].map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.num} className="card-surface p-6 space-y-3">
                        <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${step.color}`} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-600 mb-1">{step.num}</p>
                          <h3 className="font-bold text-white text-sm mb-1">{t(`flowStep.${step.key}.title`)}</h3>
                          <p className="text-xs text-zinc-400 leading-relaxed">{t(`flowStep.${step.key}.desc`)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="card-surface p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{t("preferChatTitle")}</p>
                    <p className="text-xs text-zinc-400">{t("preferChatDesc")}</p>
                  </div>
                  <Link href="/app" className="shrink-0 px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-all">
                    {t("goToChat")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Profile Card */}
                <div
                  className={`rounded-2xl border bg-linear-to-br ${profileStyle.gradient} ${profileStyle.border} p-6 sm:p-8 space-y-5`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-5xl">{profileStyle.emoji}</div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-white">{profile.title}</h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${profileStyle.badge}`}
                        >
                          {profile.type}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-sm leading-relaxed max-w-2xl">
                        {profile.description}
                      </p>
                    </div>
                  </div>

                  {/* Focus */}
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                      {t("operationalFocus")}
                    </p>
                    <p className="text-sm text-zinc-300">{profile.operationalFocus}</p>
                  </div>

                  {/* Scores */}
                  {profile.scores && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                      {(["claridad", "autoestima", "energia", "disciplina", "social"] as const).map((key) => {
                        const score = (profile.scores as Record<string, number>)[key] ?? 0;
                        const pct = Math.round((score / 5) * 100);
                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-zinc-400">{t(`scoreLabels.${key}`)}</p>
                              <p className="text-xs font-bold text-white">{score.toFixed(1)}</p>
                            </div>
                            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-linear-to-r from-violet-500 to-fuchsia-400 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Daily logs — last 7 days */}
                {data?.logs && data.logs.length > 0 && (
                  <div className="card-surface p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-violet-400" />
                      {t("last7Days")}
                    </h3>
                    <div className="flex gap-2 items-end">
                      {data.logs.slice(0, 7).map((log, i) => {
                        const momentum = log.momentum ?? 0;
                        const heightPct = Math.max(20, momentum * 20);
                        return (
                          <div key={log.id ?? i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t-sm bg-linear-to-t from-violet-500/60 to-fuchsia-400/60 transition-all"
                              style={{ height: `${heightPct}px` }}
                              title={log.note ?? undefined}
                            />
                            <p className="text-[10px] text-zinc-600">
                              {new Date(log.createdAt).toLocaleDateString("es", {
                                weekday: "narrow",
                              })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* RETOS */}
        {activeTab === "retos" && (
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : (data?.challenges ?? []).length === 0 ? (
              <div className="card-surface p-8 text-center space-y-4">
                <Target className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-zinc-400 text-sm">{t("noActiveChallenges")}</p>
                <p className="text-xs text-zinc-600">{t("noActiveChallengesHint")}</p>
              </div>
            ) : (
              <>
                {(data?.challenges ?? []).map((reto) => {
                  const Icon = CHALLENGE_ICON[reto.type] ?? Target;
                  const color = CHALLENGE_COLOR[reto.type] ?? "text-violet-400";
                  const bar = CHALLENGE_BAR[reto.type] ?? "from-violet-500 to-fuchsia-400";
                  const pct = reto.totalDays > 0
                    ? Math.round((reto.completedDays / reto.totalDays) * 100)
                    : reto.progress;
                  const done = reto.status === "completed";

                  return (
                    <div key={reto.id} className="card-surface p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-2 rounded-lg bg-zinc-800/80 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{reto.title}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {t("daysOf", { done: reto.completedDays, total: reto.totalDays })}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            done
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {done ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              {t("statusCompleted")}
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              {t("statusInProgress")}
                            </>
                          )}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className={color}>{pct}%</span>
                          <span className="text-zinc-600">{t("totalDays", { total: reto.totalDays })}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-linear-to-r ${bar} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button className="w-full py-3 px-4 rounded-xl border border-violet-500/40 text-violet-400 text-sm font-semibold hover:bg-violet-500/10 hover:border-violet-500/60 transition-all">
                  {t("requestNewChallenge")}
                </button>
              </>
            )}
          </div>
        )}

        {/* INSIGHTS */}
        {activeTab === "insights" && (
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (data?.insights ?? []).length === 0 ? (
              <div className="card-surface p-8 text-center space-y-3">
                <Brain className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-zinc-400 text-sm">
                  {t("noInsights")}
                </p>
                <p className="text-xs text-zinc-600">
                  {t("noInsightsHint")}
                </p>
              </div>
            ) : (
              (data?.insights ?? []).map((insight, i) => (
                <div
                  key={i}
                  className="card-surface p-6 flex items-start gap-4 border-l-2 border-l-violet-500"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-violet-500/15">
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{insight.title}</p>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{insight.action}</p>
                    {insight.evidence && insight.evidence.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {insight.evidence.slice(0, 2).map((e, j) => (
                          <p key={j} className="text-xs text-zinc-600 italic truncate">
                            &ldquo;{e}&rdquo;
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MENSAJES */}
        {activeTab === "mensajes" && (
          <div className="space-y-4">
            {[7, 14, 21].map((day) => {
              const locked = programDays < day;
              return (
                <div
                  key={day}
                  className={`card-surface p-6 relative overflow-hidden transition-all ${
                    locked ? "opacity-60" : ""
                  }`}
                >
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 backdrop-blur-[1px] rounded-xl">
                      <div className="flex flex-col items-center gap-2">
                        <Lock className="w-6 h-6 text-zinc-500" />
                        <p className="text-xs text-zinc-500">{t("unlocksOnDay", { day })}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        locked
                          ? "bg-zinc-800 text-zinc-500"
                          : "bg-linear-to-br from-violet-500 to-fuchsia-500 text-white"
                      }`}
                    >
                      {day}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{t(`milestoneMessages.day${day}.title`)}</h3>
                      {!locked && (
                        <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed italic">
                          &ldquo;{t(`milestoneMessages.day${day}.preview`)}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        </>}

      </div>
    </div>
  );
}
