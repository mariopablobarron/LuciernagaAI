"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type HealthStatus = "green" | "amber" | "red" | "unknown";

type HealthMetric = {
  key: string;
  label: string;
  description: string;
  value: number;
  unit: "count" | "percent" | "usd" | "ratio";
  delta: number | null;
  status: HealthStatus;
  thresholds: { green: string; amber: string; red: string };
  hint: string;
};

type HealthReport = {
  generatedAt: string;
  metrics: HealthMetric[];
  overall: HealthStatus;
};

const STATUS_STYLES: Record<
  HealthStatus,
  { ring: string; bg: string; text: string; dot: string; label: string }
> = {
  green: {
    ring: "ring-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    label: "OK",
  },
  amber: {
    ring: "ring-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    dot: "bg-amber-400",
    label: "Atención",
  },
  red: {
    ring: "ring-red-500/50",
    bg: "bg-red-500/10",
    text: "text-red-300",
    dot: "bg-red-400",
    label: "Crítico",
  },
  unknown: {
    ring: "ring-zinc-700",
    bg: "bg-zinc-900/40",
    text: "text-zinc-400",
    dot: "bg-zinc-500",
    label: "—",
  },
};

function formatValue(m: HealthMetric): string {
  if (m.unit === "percent") return `${m.value.toFixed(1)}%`;
  if (m.unit === "usd") return `$${m.value.toFixed(2)}`;
  if (m.unit === "count") return m.value.toLocaleString();
  return m.value.toFixed(2);
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const positive = delta >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? "text-emerald-300" : "text-red-300";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

function MetricCard({ m }: { m: HealthMetric }) {
  const s = STATUS_STYLES[m.status];
  return (
    <div
      className={`rounded-2xl border border-zinc-800 ${s.bg} p-5 ring-1 ${s.ring}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>
            {s.label}
          </span>
        </div>
        <DeltaBadge delta={m.delta} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
        {m.label}
      </p>
      <p className="text-3xl font-bold text-white mb-2">{formatValue(m)}</p>
      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{m.description}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          verde: {m.thresholds.green}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
          ámbar: {m.thresholds.amber}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
          rojo: {m.thresholds.red}
        </span>
      </div>
      {m.status !== "green" && (
        <div className="flex items-start gap-2 text-xs text-zinc-300 bg-zinc-900/60 rounded-lg p-2 border border-zinc-800">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{m.hint}</span>
        </div>
      )}
    </div>
  );
}

export default function AdminHealthPage() {
  const router = useRouter();
  const [data, setData] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/health", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar Health");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      credentials: "include",
      method: "POST",
    }).catch(() => {});
    router.replace("/admin/login");
  }

  const overall = data?.overall ?? "unknown";
  const overallStyle = STATUS_STYLES[overall];

  return (
    <AdminShell
      title="Health de plataforma"
      subtitle="6 métricas con umbrales de consultor. North Star: WAC (Weekly Active Contributors)."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Analytics
        </Link>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 text-zinc-600 animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          <div
            className={`rounded-2xl border border-zinc-800 ${overallStyle.bg} p-5 ring-1 ${overallStyle.ring}`}
          >
            <div className="flex items-center gap-3">
              {overall === "red" ? (
                <ShieldAlert className={`h-8 w-8 ${overallStyle.text}`} />
              ) : overall === "amber" ? (
                <AlertTriangle className={`h-8 w-8 ${overallStyle.text}`} />
              ) : (
                <CheckCircle2 className={`h-8 w-8 ${overallStyle.text}`} />
              )}
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${overallStyle.text}`}
                >
                  Estado global
                </p>
                <p className="text-2xl font-bold text-white">
                  {overall === "green"
                    ? "Plataforma saludable"
                    : overall === "amber"
                      ? "Atención requerida"
                      : overall === "red"
                        ? "Acción urgente"
                        : "Sin datos"}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Último cálculo:{" "}
                  {new Date(data.generatedAt).toLocaleString("es-ES")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.metrics.map((m) => (
              <MetricCard key={m.key} m={m} />
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-xs text-zinc-400 leading-relaxed">
            <p className="font-semibold text-zinc-200 mb-2">
              Cómo leer este panel
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="text-white font-semibold">WAC</span> es la North
                Star: mide usuarios que combinan chat + ritual en la misma
                semana. No solo tráfico.
              </li>
              <li>
                <span className="text-white font-semibold">Activación D7</span>{" "}
                te dice si el producto se explica a sí mismo. Si baja, el
                problema está en onboarding o calidad de respuesta.
              </li>
              <li>
                <span className="text-white font-semibold">Retención W2</span>{" "}
                revela si el habit loop agarra. Bajo = carta semanal y rondas no
                están funcionando.
              </li>
              <li>
                <span className="text-white font-semibold">Churn Pro</span> +{" "}
                <span className="text-white font-semibold">coste LLM/activo</span>{" "}
                son las dos caras del unit economics.
              </li>
              <li>
                <span className="text-white font-semibold">Error rate LLM</span>{" "}
                depende de que los eventos MESSAGE_RECEIVED incluyan{" "}
                <code className="text-zinc-300">metadata.fallback</code>.
              </li>
            </ul>
          </div>
        </>
      )}
    </AdminShell>
  );
}
