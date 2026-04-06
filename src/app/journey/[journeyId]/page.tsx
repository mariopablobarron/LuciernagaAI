"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock, Lock, Sparkles } from "lucide-react";
import type { JourneyMap } from "@/domain/journeys/types";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  in_progress: { icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30" },
  pending: { icon: Circle, color: "text-zinc-600", bg: "border-zinc-800 hover:border-zinc-700" },
  skipped: { icon: Circle, color: "text-zinc-700", bg: "border-zinc-800/50 opacity-60" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/60 ${className ?? ""}`} />;
}

export default function JourneyMapPage() {
  const { journeyId } = useParams<{ journeyId: string }>();
  const [journey, setJourney] = useState<JourneyMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/journeys/${journeyId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setJourney(data.journey);
        setLoading(false);
      });
  }, [journeyId]);

  if (loading) {
    return (
      <div className="bg-zinc-950">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-zinc-950">
        <p className="text-zinc-400">Itinerario no encontrado</p>
        <Link href="/journey" className="text-sm text-violet-400 hover:text-violet-300">← Volver a itinerarios</Link>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-1/3 top-0 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* Back link */}
        <Link
          href="/journey"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Itinerarios
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
            {journey.iconEmoji}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{journey.title}</h1>
            <p className="mt-1 text-sm text-zinc-400">{journey.description}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="card-surface rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Progreso total</p>
            <p className="text-lg font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {journey.progress}%
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
              style={{ width: `${journey.progress}%` }}
            />
          </div>
        </div>

        {/* Module Map */}
        <div className="space-y-5">
          {journey.modules.map((mod, modIdx) => {
            const isComplete = mod.completedCount === mod.totalCount && mod.totalCount > 0;

            return (
              <div key={mod.id} className="relative">
                {/* Connection line */}
                {modIdx > 0 && (
                  <div className="absolute -top-5 left-7 h-5 w-px bg-zinc-800" />
                )}

                {/* Module */}
                <div
                  className={`card-surface rounded-xl border p-5 transition-all ${
                    mod.unlocked
                      ? isComplete
                        ? "border-emerald-500/20"
                        : "border-zinc-800 hover:border-zinc-700"
                      : "border-zinc-800/50 opacity-50"
                  }`}
                >
                  {/* Module header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{mod.iconEmoji}</span>
                      <div>
                        <h3 className="font-bold text-white">{mod.title}</h3>
                        <p className="text-xs text-zinc-500">
                          {mod.completedCount}/{mod.totalCount} ejercicios
                          {!mod.unlocked && (
                            <span className="ml-2 inline-flex items-center gap-1 text-zinc-600">
                              <Lock className="h-3 w-3" /> Completa el anterior
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isComplete && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        Completado
                      </span>
                    )}
                  </div>

                  {/* Exercises */}
                  {mod.unlocked && (
                    <div className="mt-4 space-y-2">
                      {mod.exercises.map((ex) => {
                        const cfg = STATUS_CONFIG[ex.status] ?? STATUS_CONFIG.pending;
                        const StatusIcon = cfg.icon;

                        return (
                          <Link
                            key={ex.id}
                            href={`/journey/exercise/${ex.id}`}
                            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all group ${cfg.bg}`}
                          >
                            <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${ex.status === "completed" ? "text-zinc-400" : "text-white"}`}>
                                {ex.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-zinc-600 mt-0.5">
                                <Clock className="h-3 w-3" />
                                <span>{ex.estimatedMinutes} min</span>
                                <span>·</span>
                                <span className="capitalize">{ex.type}</span>
                              </div>
                            </div>
                            <span className="text-xs text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                              {ex.status === "completed" ? "Revisar" : "Abrir"} →
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-zinc-700">
          Tres Mil Millones de Latidos no sustituye terapia ni intervención psicológica profesional.
        </p>
      </div>
    </div>
  );
}
