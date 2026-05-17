"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  ChevronRight,
  Compass,
  Heart,
  Rocket,
  Search,
  Sparkles,
} from "lucide-react";
import type { JourneyPhase } from "@/domain/journeys/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type JourneyListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  phase: JourneyPhase;
  iconEmoji: string;
  durationWeeks: number;
  moduleCount: number;
  exerciseCount: number;
  enrolled: boolean;
  userProgress: number | null;
  userStatus: string | null;
};

type ActiveJourney = {
  journeyId: string;
  journeyTitle: string;
  journeyPhase: JourneyPhase;
  progress: number;
  completedExercises: number;
  totalExercises: number;
  currentModule: { id: string; title: string } | null;
  nextExercise: {
    id: string;
    title: string;
    type: string;
    estimatedMinutes: number;
  } | null;
};

// ─── Config ──────────────────────────────────────────────────────────────────

// Estilo visual estable; label/desc se leen de messages.journeyPage.phases.<phase>
const PHASE_STYLE: Record<
  JourneyPhase,
  {
    gradient: string;
    border: string;
    badge: string;
    accentText: string;
    icon: typeof Search;
  }
> = {
  autoconocimiento: {
    gradient: "from-violet-900/40 to-purple-900/20",
    border: "border-violet-500/30",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    accentText: "text-violet-400",
    icon: Search,
  },
  gestion_emocional: {
    gradient: "from-cyan-900/40 to-teal-900/20",
    border: "border-cyan-500/30",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    accentText: "text-cyan-400",
    icon: Heart,
  },
  proposito: {
    gradient: "from-amber-900/40 to-orange-900/20",
    border: "border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accentText: "text-amber-400",
    icon: Compass,
  },
  accion: {
    gradient: "from-emerald-900/40 to-green-900/20",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    accentText: "text-emerald-400",
    icon: Rocket,
  },
};

// IDs estables — labels en messages.journeyPage.exerciseTypes.<id>
const KNOWN_EXERCISE_TYPES = ["reflection", "writing", "action", "assessment", "breathing", "visualization"];

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-800/60 ${className ?? ""}`}
    />
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function JourneyPage() {
  const t = useTranslations("journeyPage");
  const [journeys, setJourneys] = useState<JourneyListItem[]>([]);
  const [active, setActive] = useState<ActiveJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [jRes, aRes] = await Promise.all([
          fetch("/api/journeys", { credentials: "include" }).then((r) =>
            r.json(),
          ),
          fetch("/api/journeys/active", { credentials: "include" }).then((r) =>
            r.json(),
          ),
        ]);

        if (cancelled) return;
        if (jRes.success) setJourneys(jRes.journeys);
        if (aRes.success && aRes.journey) setActive(aRes.journey);
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

  async function enroll(slug: string) {
    setEnrolling(slug);
    try {
      const res = await fetch("/api/journeys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journeySlug: slug }),
      });
      const data = await res.json();
      if (data.success) {
        setActive(data.journey);
        setJourneys((prev) =>
          prev.map((j) =>
            j.slug === slug
              ? { ...j, enrolled: true, userProgress: 0, userStatus: "active" }
              : j,
          ),
        );
      }
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <div className="bg-zinc-950">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-1/4 top-0 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{t("subtitle")}</p>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:from-violet-400 hover:to-fuchsia-400"
          >
            <Sparkles className="h-4 w-4" />
            {t("goToChat")}
          </Link>
        </div>

        {/* ── Active Journey Card ────────────────────────────────── */}
        {loading ? (
          <Skeleton className="h-44" />
        ) : active ? (
          <div
            className={`card-surface rounded-xl border p-6 ${
              PHASE_STYLE[active.journeyPhase]?.border ?? "border-violet-500/30"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <BookOpen
                    className={`h-6 w-6 ${PHASE_STYLE[active.journeyPhase]?.accentText ?? "text-violet-400"}`}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("activeLabel")}
                  </p>
                  <h2 className="mt-0.5 text-xl font-bold text-white">
                    {active.journeyTitle}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {active.currentModule?.title ?? t("completed")} ·{" "}
                    {t("exercisesCountTpl", { done: active.completedExercises, total: active.totalExercises })}
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {active.progress}%
              </p>
            </div>

            {/* Progress bar */}
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                style={{ width: `${active.progress}%` }}
              />
            </div>

            {/* Next exercise CTA */}
            {active.nextExercise && (
              <Link
                href={`/journey/exercise/${active.nextExercise.id}`}
                className="mt-4 flex items-center justify-between rounded-lg border border-zinc-800 p-4 transition-all hover:border-violet-500/40 hover:bg-violet-500/5 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                    <ChevronRight className="h-4 w-4 text-violet-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {active.nextExercise.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {active.nextExercise.estimatedMinutes} min ·{" "}
                      {KNOWN_EXERCISE_TYPES.includes(active.nextExercise.type)
                        ? t(`exerciseTypes.${active.nextExercise.type}`)
                        : active.nextExercise.type}
                    </p>
                  </div>
                </div>
                <span className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-colors group-hover:bg-violet-500/20">
                  {t("continue")}
                </span>
              </Link>
            )}

            <Link
              href={`/journey/${active.journeyId}`}
              className="mt-3 block text-center text-sm text-zinc-500 hover:text-violet-400 transition-colors"
            >
              {t("viewFullMap")}
            </Link>
          </div>
        ) : (
          /* Empty state — no active journey */
          <div className="card-surface rounded-xl border border-zinc-800 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
              <BookOpen className="h-7 w-7 text-violet-400" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white">{t("emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{t("emptyDesc")}</p>
          </div>
        )}

        {/* ── How it works (only if no active journey) ───────────── */}
        {!active && !loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="card-surface p-4 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <span className="text-xs font-bold text-violet-400">{n}</span>
                </div>
                <p className="text-sm font-semibold text-white">{t(`steps.step${n}Title`)}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{t(`steps.step${n}Desc`)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Journey Cards ──────────────────────────────────────── */}
        <div>
          <h2 className="mb-4 font-bold text-white flex items-center gap-2">
            <Compass className="h-4 w-4 text-violet-400" />
            {t("availableHeader")}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-56" />
                ))
              : journeys.map((j) => {
                  const style = PHASE_STYLE[j.phase];
                  const Icon = style.icon;
                  const isActive = active?.journeyId === j.id;

                  return (
                    <div
                      key={j.id}
                      className={`rounded-xl border bg-linear-to-br ${style.gradient} ${style.border} p-5 space-y-4 transition-all ${
                        isActive ? "ring-1 ring-violet-500/30" : ""
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/50">
                            <Icon className={`h-5 w-5 ${style.accentText}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{j.title}</h3>
                            <span
                              className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style.badge}`}
                            >
                              {t(`phases.${j.phase}.label`)}
                            </span>
                          </div>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                            {t("active")}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm leading-relaxed text-zinc-400">
                        {j.description}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-zinc-600">
                        <span>{t("modulesTpl", { n: j.moduleCount })}</span>
                        <span>·</span>
                        <span>{t("exercisesTpl", { n: j.exerciseCount })}</span>
                        <span>·</span>
                        <span>{t("weeksTpl", { n: j.durationWeeks })}</span>
                      </div>

                      {/* Action */}
                      {j.enrolled && j.userProgress !== null ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">{t("progress")}</span>
                            <span className="font-semibold text-white">
                              {j.userProgress}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-all"
                              style={{ width: `${j.userProgress}%` }}
                            />
                          </div>
                          <Link
                            href={`/journey/${j.id}`}
                            className={`mt-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${style.border} ${style.accentText} hover:bg-zinc-800/50`}
                          >
                            {isActive ? t("viewMap") : t("continue")}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      ) : (
                        <button
                          onClick={() => enroll(j.slug)}
                          disabled={enrolling === j.slug}
                          className="w-full rounded-lg bg-linear-to-r from-violet-500/80 to-fuchsia-500/80 py-2.5 text-sm font-semibold text-white transition-all hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-50 shadow-lg shadow-violet-500/10"
                        >
                          {enrolling === j.slug ? t("starting") : t("start")}
                        </button>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>

        {/* ── Disclaimer ─────────────────────────────────────────── */}
        <p className="text-center text-xs text-zinc-700">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
