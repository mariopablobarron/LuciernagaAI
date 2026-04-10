"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import GlassesToggle from "@/components/effects/GlassesToggle";

type AvoidedAction = {
  description: string;
  goalTitle: string;
  count: number;
  types: string[];
  lastAvoided: string;
  completed: boolean;
};

type WeeklyTrend = { week: string; count: number };

type AvoidanceData = {
  totalLast30: number;
  totalLast7: number;
  topAvoided: AvoidedAction[];
  weeklyTrend: WeeklyTrend[];
};

const TYPE_LABELS: Record<string, string> = {
  postpone: "Pospuesto",
  refuse: "Rechazado",
  avoidance: "Evitado",
};

export default function AvoidanceMap() {
  const [data, setData] = useState<AvoidanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/avoidance-map")
      .then((r) => r.json())
      .then((d: AvoidanceData) => setData(d))
      .catch(() => { /* Non-critical widget — silent fail */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-zinc-500 text-sm">Cargando mapa de evitación...</div>
      </div>
    );
  }

  if (!data || data.totalLast30 === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
        <p className="text-zinc-400">No hay patrones de evitación en los últimos 30 días.</p>
        <p className="text-sm text-zinc-600">Eso es buena señal.</p>
      </div>
    );
  }

  const trendDirection = data.totalLast7 > (data.totalLast30 - data.totalLast7) / 3 ? "up" : "down";
  const maxWeekCount = Math.max(...data.weeklyTrend.map((w) => w.count), 1);

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-2xl font-bold text-white">{data.totalLast7}</p>
          <p className="text-xs text-zinc-500">últimos 7 días</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-2xl font-bold text-white">{data.totalLast30}</p>
          <p className="text-xs text-zinc-500">últimos 30 días</p>
          <div className="flex items-center gap-1 mt-1">
            {trendDirection === "up" ? (
              <TrendingUp className="w-3 h-3 text-red-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-emerald-400" />
            )}
            <span className={`text-xs ${trendDirection === "up" ? "text-red-400" : "text-emerald-400"}`}>
              {trendDirection === "up" ? "Subiendo" : "Bajando"}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly trend bars */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-zinc-300">Tendencia semanal</p>
        <div className="flex items-end gap-2 h-16">
          {data.weeklyTrend.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex justify-center">
                <div
                  className="w-full max-w-8 rounded-t bg-gradient-to-t from-red-500/60 to-orange-400/60 transition-all"
                  style={{ height: `${Math.max((w.count / maxWeekCount) * 100, 4)}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-600">{w.week}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top avoided actions */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          Lo que más evitas
        </p>
        {data.topAvoided.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 space-y-2 ${
              item.completed
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-orange-500/20 bg-orange-500/5"
            }`}
          >
            <GlassesToggle
              before={
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.completed ? "text-zinc-500 line-through" : "text-white"}`}>
                      {item.description}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{item.goalTitle}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-lg font-bold text-orange-400">{item.count}x</span>
                  </div>
                </div>
              }
              after={
                <div>
                  <p className="text-sm font-medium text-cyan-300">
                    Evitas esto {item.count} veces. ¿Qué protege esa decisión?
                  </p>
                  <p className="text-xs text-violet-400 mt-1">
                    {item.completed
                      ? "Lo completaste — el patrón se rompió."
                      : `Cada vez que pospones "${item.description}", refuerzas el patrón.`}
                  </p>
                </div>
              }
            />
            <div className="flex gap-1.5 flex-wrap">
              {item.types.map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {TYPE_LABELS[t] ?? t}
                </span>
              ))}
              {item.completed && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Completado
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
