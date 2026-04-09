"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Compass, Heart, Rocket, Eye, Pause, Play, CheckCircle,
  ChevronRight, Lightbulb,
} from "lucide-react";

type ProjectSummary = {
  projectId: string;
  title: string;
  phase: string;
  status: string;
  focusAreaCount: number;
  completedSteps: number;
  totalSteps: number;
  reflectionCount: number;
  insightCount: number;
  unacknowledgedInsights: number;
  daysActive: number;
};

const PHASE_CONFIG: Record<string, { label: string; icon: typeof Heart; color: string; bg: string }> = {
  feel: { label: "Sentir", icon: Heart, color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30" },
  imagine: { label: "Imaginar", icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
  act: { label: "Actuar", icon: Rocket, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  reflect: { label: "Reflexionar", icon: Eye, color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/30" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "text-emerald-400" },
  paused: { label: "Pausado", color: "text-amber-400" },
  completed: { label: "Completado", color: "text-cyan-400" },
  abandoned: { label: "Abandonado", color: "text-zinc-500" },
};

export default function ProyectoHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = projects.find((p) => p.status === "active");
  const others = projects.filter((p) => p.status !== "active");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Mi Proyecto</h1>
        </div>
        <p className="text-sm text-zinc-400 max-w-xl">
          Tu proyecto personal — un espacio para explorar lo que quieres cambiar,
          definir tus propios focos y actuar. El sistema no te dice que hacer.
          Te ayuda a descubrir lo que ya sabes pero no te atreves a ver.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Active project card */}
          {active ? (
            <Link href={`/proyecto/${active.projectId}`} className="block group">
              <div className="card-surface rounded-2xl border border-zinc-800 p-6 hover:border-violet-500/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border-emerald-500/30">
                        Proyecto activo
                      </span>
                      {(() => {
                        const phase = PHASE_CONFIG[active.phase];
                        if (!phase) return null;
                        const Icon = phase.icon;
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${phase.color} ${phase.bg}`}>
                            <Icon className="h-3 w-3" /> {phase.label}
                          </span>
                        );
                      })()}
                    </div>
                    <h2 className="text-xl font-bold text-white">{active.title}</h2>
                    <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                      <span>{active.focusAreaCount} focos</span>
                      <span>{active.completedSteps}/{active.totalSteps} pasos</span>
                      <span>{active.reflectionCount} reflexiones</span>
                      <span>{active.daysActive} dias</span>
                      {active.unacknowledgedInsights > 0 && (
                        <span className="text-amber-400 font-semibold">{active.unacknowledgedInsights} insights nuevos</span>
                      )}
                    </div>
                    {/* Progress bar */}
                    {active.totalSteps > 0 && (
                      <div className="w-full max-w-xs">
                        <div className="h-1.5 rounded-full bg-zinc-800">
                          <div
                            className="h-1.5 rounded-full bg-violet-500 transition-all"
                            style={{ width: `${Math.round((active.completedSteps / active.totalSteps) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-violet-400 transition-colors mt-1" />
                </div>
              </div>
            </Link>
          ) : (
            /* No active project — CTA */
            <div className="card-surface rounded-2xl border border-dashed border-zinc-700 p-8 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                <Compass className="h-7 w-7 text-violet-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">Empieza tu proyecto</h2>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Define algo que quieras cambiar, explorar o resolver.
                  El proceso te guia a traves de 4 fases: sentir, imaginar, actuar y reflexionar.
                </p>
              </div>
              <Link
                href="/proyecto/nuevo"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-colors"
              >
                <Plus className="h-4 w-4" /> Crear proyecto
              </Link>
            </div>
          )}

          {/* Past projects */}
          {others.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Proyectos anteriores</h3>
              {others.map((p) => {
                const phase = PHASE_CONFIG[p.phase];
                const status = STATUS_CONFIG[p.status];
                return (
                  <Link key={p.projectId} href={`/proyecto/${p.projectId}`} className="block group">
                    <div className="card-surface rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${status?.color ?? "text-zinc-500"}`}>{status?.label ?? p.status}</span>
                        <span className="text-sm font-medium text-white">{p.title}</span>
                        {phase && (
                          <span className={`text-[10px] ${phase.color}`}>{phase.label}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>{p.daysActive}d</span>
                        <span>{p.completedSteps}/{p.totalSteps} pasos</span>
                        <ChevronRight className="h-4 w-4 group-hover:text-zinc-300 transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Create new even if active exists */}
          {active && (
            <div className="text-center">
              <Link
                href="/proyecto/nuevo"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-violet-400 transition-colors"
              >
                <Plus className="h-4 w-4" /> Crear nuevo proyecto (pausa el actual)
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
