"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, TrendingDown, TrendingUp, Minus,
  Clock, XCircle, SkipForward, CheckCircle2, RefreshCw,
} from "lucide-react";

type Pattern = {
  action: string;
  goal: string | null;
  total: number;
  last7d: number;
  dominantType: string;
  lastSeen: string;
  resolved: boolean;
};

type Summary = {
  total30d: number;
  total7d: number;
  byType: { postpone: number; refuse: number; avoidance: number };
};

type WeekTrend = { week: string; count: number };

type ApiData = {
  ok: boolean;
  summary: Summary;
  patterns: Pattern[];
  trend: WeekTrend[];
};

const TYPE_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  postpone: { icon: Clock, label: "Postergas", color: "text-amber-400" },
  refuse: { icon: XCircle, label: "Rechazas", color: "text-red-400" },
  avoidance: { icon: SkipForward, label: "Esquivas", color: "text-violet-400" },
};

function TrendBar({ weeks }: { weeks: WeekTrend[] }) {
  const max = Math.max(...weeks.map((w) => w.count), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {weeks.map((w) => {
        const h = Math.max((w.count / max) * 100, 4);
        return (
          <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-zinc-500">{w.count}</span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-fuchsia-500 transition-all"
              style={{ height: `${h}%` }}
            />
            <span className="text-[10px] text-zinc-600">{w.week}</span>
          </div>
        );
      })}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: WeekTrend[] }) {
  if (trend.length < 2) return null;
  const last = trend[trend.length - 1].count;
  const prev = trend[trend.length - 2].count;
  if (last < prev)
    return (
      <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
        <TrendingDown className="w-3.5 h-3.5" /> Bajando
      </div>
    );
  if (last > prev)
    return (
      <div className="flex items-center gap-1 text-red-400 text-xs font-semibold">
        <TrendingUp className="w-3.5 h-3.5" /> Subiendo
      </div>
    );
  return (
    <div className="flex items-center gap-1 text-zinc-500 text-xs font-semibold">
      <Minus className="w-3.5 h-3.5" /> Estable
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function PatronesPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/avoidance-patterns", { credentials: "include" })
      .then((r) => r.json())
      .then((d: ApiData) => setData(d))
      .catch(() => { toast.error("No se pudieron cargar los patrones"); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  const summary = data?.summary;
  const patterns = data?.patterns ?? [];
  const trend = data?.trend ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/app" className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Lo que evitas</h1>
            <p className="text-xs text-zinc-500">Tus patrones de evitacion de los ultimos 30 dias</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Empty state */}
        {(!summary || summary.total30d === 0) && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold">Sin evitaciones detectadas</h2>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              En los ultimos 30 dias no has postergado, rechazado ni esquivado ninguna accion. Buen trabajo.
            </p>
          </div>
        )}

        {summary && summary.total30d > 0 && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                <p className="text-2xl font-bold">{summary.total7d}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Esta semana</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                <p className="text-2xl font-bold">{summary.total30d}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">30 dias</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                <TrendIndicator trend={trend} />
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-2">Tendencia</p>
              </div>
            </div>

            {/* Type breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((type) => {
                const config = TYPE_CONFIG[type];
                const Icon = config.icon;
                const count = summary.byType[type as keyof typeof summary.byType] ?? 0;
                return (
                  <div key={type} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-xs font-semibold text-zinc-400">{config.label}</span>
                    </div>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>

            {/* Trend chart */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="text-sm font-semibold mb-4">Evitaciones por semana</h3>
              <TrendBar weeks={trend} />
            </div>

            {/* Pattern list */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Lo que mas evitas
              </h3>
              <div className="space-y-2">
                {patterns.map((p, i) => {
                  const config = TYPE_CONFIG[p.dominantType] ?? TYPE_CONFIG.avoidance;
                  const Icon = config.icon;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 transition-colors ${
                        p.resolved
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-zinc-800 bg-zinc-900/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${config.color}`} />
                            <p className="text-sm font-semibold text-white truncate">{p.action}</p>
                          </div>
                          {p.goal && (
                            <p className="text-xs text-zinc-500 ml-5.5">Meta: {p.goal}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold">{p.total}x</p>
                          <p className="text-[10px] text-zinc-600">{formatRelative(p.lastSeen)}</p>
                        </div>
                      </div>
                      {p.resolved && (
                        <div className="flex items-center gap-1 mt-2 ml-5.5 text-emerald-400 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Completada
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insight */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                {summary.byType.postpone > summary.byType.refuse && summary.byType.postpone > summary.byType.avoidance
                  ? "Tu patron principal es postergar. Sueles decir \"manana\" en vez de \"no\". Reducir el tamano de la accion puede ayudar."
                  : summary.byType.refuse > summary.byType.avoidance
                    ? "Tiendes a rechazar acciones directamente. Puede que el objetivo necesite ajustarse a algo mas realista."
                    : "Tiendes a esquivar el tema — cambias de conversacion o desvias. Nombrar la evitacion es el primer paso para romperla."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
