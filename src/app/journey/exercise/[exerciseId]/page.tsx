"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Sparkles } from "lucide-react";
import type { ExerciseStep, ExerciseResponse, ExerciseType } from "@/domain/journeys/types";

type ExerciseDetail = {
  id: string;
  title: string;
  description: string;
  type: ExerciseType;
  estimatedMinutes: number;
  instructions: ExerciseStep[];
  moduleName: string;
  journeyName: string;
  status: string;
  responses: ExerciseResponse[] | null;
  reflection: string | null;
  aiDebrief: string | null;
};

// Iconos y color por tipo. La etiqueta legible vive en i18n (journeyPage.exerciseTypes).
const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  reflection: { icon: "🪞", color: "text-violet-400" },
  writing: { icon: "✍️", color: "text-cyan-400" },
  action: { icon: "⚡", color: "text-emerald-400" },
  assessment: { icon: "📊", color: "text-amber-400" },
  breathing: { icon: "🌬️", color: "text-cyan-400" },
  visualization: { icon: "🎯", color: "text-fuchsia-400" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/60 ${className ?? ""}`} />;
}

export default function ExercisePage() {
  const t = useTranslations("journeyPage");
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Map<number, string | number>>(new Map());
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showReflection, setShowReflection] = useState(false);

  useEffect(() => {
    fetch(`/api/journeys/exercise/${exerciseId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.exercise) {
          setExercise(data.exercise);
          if (data.exercise.status === "completed") {
            setCompleted(true);
            if (data.exercise.responses) {
              const map = new Map<number, string | number>();
              for (const r of data.exercise.responses) {
                map.set(r.stepIndex, r.answer);
              }
              setResponses(map);
            }
            setReflection(data.exercise.reflection ?? "");
          }
        }
        setLoading(false);
      });
  }, [exerciseId]);

  const markStarted = useCallback(async () => {
    await fetch(`/api/journeys/exercise/${exerciseId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
  }, [exerciseId]);

  useEffect(() => {
    if (exercise && exercise.status === "pending") {
      markStarted();
    }
  }, [exercise, markStarted]);

  function updateResponse(stepIndex: number, value: string | number) {
    setResponses((prev) => {
      const next = new Map(prev);
      next.set(stepIndex, value);
      return next;
    });
  }

  async function handleComplete() {
    setSubmitting(true);
    const responseArray: ExerciseResponse[] = [];
    responses.forEach((answer, stepIndex) => {
      responseArray.push({ stepIndex, answer });
    });

    const res = await fetch(`/api/journeys/exercise/${exerciseId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        responses: responseArray,
        reflection: reflection.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setCompleted(true);
    }
    setSubmitting(false);
  }

  // ─── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-zinc-950">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-zinc-950">
        <p className="text-zinc-400">{t("exercise.notFound")}</p>
        <Link href="/journey" className="text-sm text-violet-400">← {t("exercise.breadcrumb")}</Link>
      </div>
    );
  }

  const steps = exercise.instructions;
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const typeCfg = TYPE_CONFIG[exercise.type] ?? TYPE_CONFIG.reflection;
  const canAdvance = step?.inputType === "none" || responses.has(step?.step ?? currentStep);

  // ─── Completed view ─────────────────────────────────────────────
  if (completed) {
    return (
      <div className="bg-zinc-950">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute right-1/3 top-1/4 h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl" />
        </div>

        <div className="mx-auto max-w-2xl px-4 py-8">
          <Link
            href="/journey"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("exercise.breadcrumb")}
          </Link>

          <div className="mt-6 card-surface rounded-xl border border-emerald-500/20 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">{t("exercise.completedTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-400">{exercise.title}</p>

            {exercise.aiDebrief && (
              <div className="mt-6 card-surface rounded-xl border border-violet-500/20 p-5 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("exercise.debriefLabel")}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {exercise.aiDebrief}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/journey"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {t("exercise.viewJourney")}
              </Link>
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                {t("exercise.talkToMentor")}
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-700">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    );
  }

  // ─── Exercise flow ──────────────────────────────────────────────
  return (
    <div className="bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-1/4 top-0 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Back */}
        <Link
          href="/journey"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("exercise.breadcrumb")}
        </Link>

        {/* Header */}
        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 text-2xl">
            {typeCfg.icon}
          </div>
          <div>
            <p className="text-xs text-zinc-600">
              {exercise.journeyName} · {exercise.moduleName}
            </p>
            <h1 className="text-xl font-bold text-white">{exercise.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              <span>{t("exercise.minutesTpl", { n: exercise.estimatedMinutes })}</span>
              <span>·</span>
              <span className={typeCfg.color}>{t(`exerciseTypes.${exercise.type}`)}</span>
            </div>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="mt-6 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < currentStep
                  ? "bg-violet-500"
                  : i === currentStep
                    ? "bg-linear-to-r from-violet-500 to-fuchsia-500"
                    : "bg-zinc-800"
              }`}
            />
          ))}
          {/* Extra segment for reflection */}
          <div
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              showReflection ? "bg-fuchsia-500" : "bg-zinc-800"
            }`}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          {t("exercise.stepProgressTpl", { current: currentStep + 1, total: steps.length })}
        </p>

        {/* Current step card */}
        {!showReflection && step && (
          <div className="mt-6 card-surface rounded-xl border border-zinc-800 p-6 space-y-4">
            <h3 className="font-bold text-white">{step.title}</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{step.prompt}</p>

            {/* Input based on type */}
            {step.inputType === "text" && (
              <textarea
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-colors"
                rows={4}
                placeholder={t("exercise.textPlaceholder")}
                value={(responses.get(step.step) as string) ?? ""}
                onChange={(e) => updateResponse(step.step, e.target.value)}
              />
            )}

            {step.inputType === "choice" && step.options && (
              <div className="space-y-2">
                {step.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => updateResponse(step.step, opt)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      responses.get(step.step) === opt
                        ? "border-violet-500 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/5"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {step.inputType === "scale" && (
              <div className="space-y-3">
                <input
                  type="range"
                  min={step.scaleMin ?? 1}
                  max={step.scaleMax ?? 5}
                  value={(responses.get(step.step) as number) ?? step.scaleMin ?? 1}
                  onChange={(e) => updateResponse(step.step, Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{step.scaleLabels?.min ?? step.scaleMin}</span>
                  <span className="rounded-full bg-violet-500/10 px-3 py-0.5 text-sm font-bold text-violet-400">
                    {(responses.get(step.step) as number) ?? step.scaleMin ?? 1}
                  </span>
                  <span>{step.scaleLabels?.max ?? step.scaleMax}</span>
                </div>
              </div>
            )}

            {step.inputType === "none" && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                <p className="text-xs italic text-zinc-500">
                  {t("exercise.pauseHint")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reflection step */}
        {showReflection && (
          <div className="mt-6 card-surface rounded-xl border border-fuchsia-500/20 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              <h3 className="font-bold text-white">{t("exercise.reflectionTitle")}</h3>
            </div>
            <p className="text-sm text-zinc-400">
              {t("exercise.reflectionPrompt")}
            </p>
            <textarea
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
              rows={4}
              placeholder={t("exercise.reflectionPlaceholder")}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center gap-3">
          {currentStep > 0 && !showReflection && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("exercise.previous")}
            </button>
          )}
          {showReflection && (
            <button
              onClick={() => setShowReflection(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("exercise.back")}
            </button>
          )}

          <div className="flex-1" />

          {!showReflection && !isLastStep && (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t("exercise.next")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {!showReflection && isLastStep && (
            <button
              onClick={() => setShowReflection(true)}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t("exercise.reflect")}
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}

          {showReflection && (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("exercise.saving")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("exercise.complete")}
                </>
              )}
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-center text-xs text-zinc-700">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
