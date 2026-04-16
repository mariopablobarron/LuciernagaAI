"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Plug,
  RefreshCw,
  ShieldAlert,
  Timer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

type CheckStatus = "ok" | "warn" | "fail" | "skip";
type Category = "infra" | "integrations" | "crons" | "product" | "security";

type CheckResult = {
  id: string;
  name: string;
  category: Category;
  status: CheckStatus;
  latencyMs: number;
  detail: string;
  meta?: Record<string, string | number | boolean | null>;
};

type StatusResponse = {
  cached: boolean;
  generatedAt: string;
  durationMs: number;
  summary: {
    ok: number;
    warn: number;
    fail: number;
    skip: number;
    overall: CheckStatus;
  };
  results: CheckResult[];
};

const CATEGORY_META: Record<Category, { title: string; description: string }> = {
  infra: {
    title: "Infraestructura",
    description: "Base de datos y migraciones Prisma",
  },
  integrations: {
    title: "Integraciones externas",
    description: "APIs de terceros y webhooks",
  },
  security: {
    title: "Seguridad",
    description: "Secrets y configuración crítica",
  },
  crons: {
    title: "Crons & jobs",
    description: "Tareas programadas",
  },
  product: {
    title: "Producto (actividad reciente)",
    description: "Contadores de uso en últimas 24h",
  },
};

const CATEGORY_ORDER: Category[] = [
  "infra",
  "security",
  "integrations",
  "crons",
  "product",
];

const STATUS_COLORS: Record<CheckStatus, { dot: string; text: string; bg: string }> = {
  ok: {
    dot: "bg-emerald-500",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  warn: {
    dot: "bg-amber-500",
    text: "text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  fail: {
    dot: "bg-red-500",
    text: "text-red-300",
    bg: "bg-red-500/10 border-red-500/30",
  },
  skip: {
    dot: "bg-zinc-500",
    text: "text-zinc-400",
    bg: "bg-zinc-500/10 border-zinc-500/30",
  },
};

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-red-400" />;
  return <Activity className="h-4 w-4 text-zinc-400" />;
}

export default function AdminStatusPage() {
  const router = useRouter();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/status${force ? "?force=1" : ""}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as StatusResponse;
      setData(json);
      if (force) toast.success("Checks ejecutados");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "error desconocido";
      toast.error(`Error cargando status: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load(false);
    const id = setInterval(() => void load(false), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<Category, CheckResult[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const r of data?.results ?? []) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }, [data]);

  const summary = data?.summary;
  const overallBadge = summary
    ? STATUS_COLORS[summary.overall]
    : STATUS_COLORS.skip;

  return (
    <AdminShell
      title="Estado del sistema"
      subtitle="Health checks de integraciones, base de datos, seguridad y producto"
      showSectionNav={false}
      onLogout={async () => {
        await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
        router.replace("/admin/login");
      }}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminMetricCard
          label="Estado global"
          value={summary ? summary.overall.toUpperCase() : "…"}
          accent={summary?.overall === "fail" ? "rose" : summary?.overall === "warn" ? "amber" : "emerald"}
          icon={<Activity className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="OK"
          value={summary?.ok ?? 0}
          accent="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="Warnings"
          value={summary?.warn ?? 0}
          accent="amber"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="Fallos"
          value={summary?.fail ?? 0}
          accent="rose"
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <Timer className="h-4 w-4" />
          <span>
            {data
              ? `Última ejecución: ${new Date(data.generatedAt).toLocaleTimeString()} · ${data.durationMs}ms${data.cached ? " (cache)" : ""}`
              : "Cargando…"}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${overallBadge.bg} ${overallBadge.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${overallBadge.dot}`} />
            {summary?.overall ?? "…"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Run now
        </button>
      </div>

      {/* Grouped checks */}
      {loading && !data ? (
        <div className="py-12 text-center text-zinc-500">Cargando checks…</div>
      ) : (
        <div className="space-y-5">
          {CATEGORY_ORDER.map((category) => {
            const items = grouped.get(category) ?? [];
            if (items.length === 0) return null;
            const meta = CATEGORY_META[category];
            return (
              <AdminPanel
                key={category}
                title={meta.title}
                description={meta.description}
                headerRight={
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                    <Plug className="h-3 w-3" />
                    {items.length}
                  </span>
                }
              >
                <div className="divide-y divide-zinc-800">
                  {items.map((check) => {
                    const colors = STATUS_COLORS[check.status];
                    return (
                      <div
                        key={check.id}
                        className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <StatusIcon status={check.status} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-zinc-200 truncate">
                              {check.name}
                            </span>
                            <span className="shrink-0 text-[11px] text-zinc-500 tabular-nums">
                              {check.latencyMs}ms
                            </span>
                          </div>
                          <p className={`mt-0.5 text-xs ${colors.text}`}>
                            {check.detail}
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-600 font-mono">{check.id}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
