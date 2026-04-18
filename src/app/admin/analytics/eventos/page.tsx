"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type EventItem = {
  id: string;
  userId: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type EventsResponse = {
  items: EventItem[];
  nextCursor: string | null;
  counts: { byType: { type: string; count: number }[] };
  series: { date: string; type: string; count: number }[];
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventosPage() {
  const router = useRouter();
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: "", userId: "" });
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.userId) params.set("userId", filters.userId);
      const res = await fetch(`/api/admin/analytics/events?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar eventos");
    } finally {
      setLoading(false);
    }
  }, [router, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  function exportCsv() {
    const params = new URLSearchParams({ format: "csv" });
    if (filters.type) params.set("type", filters.type);
    if (filters.userId) params.set("userId", filters.userId);
    window.open(`/api/admin/analytics/events?${params.toString()}`, "_blank");
  }

  // Build 30d stacked series summary
  const dayMap = new Map<string, number>();
  if (data) {
    for (const s of data.series) {
      dayMap.set(s.date, (dayMap.get(s.date) ?? 0) + s.count);
    }
  }
  const days: { date: string; total: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, total: dayMap.get(key) ?? 0 });
  }
  const maxDaily = Math.max(1, ...days.map((d) => d.total));

  return (
    <AdminShell
      title="Explorar eventos"
      subtitle="Tabla de Event con filtros por tipo, usuario y fecha. Construye embudos custom."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a analytics
        </Link>
      </div>

      {/* Volume chart */}
      {data && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-400 mb-3">
            Eventos por día · últimos 30 días {filters.type && `· tipo ${filters.type}`}
          </p>
          <div className="flex items-end gap-0.5 h-16">
            {days.map((d) => {
              const h = (d.total / maxDaily) * 100;
              return (
                <div
                  key={d.date}
                  title={`${d.date} — ${d.total}`}
                  className="flex-1 flex flex-col justify-end"
                >
                  <div
                    className="bg-violet-500/60 rounded-t hover:bg-violet-400 transition-all"
                    style={{ height: `${Math.max(h, d.total > 0 ? 3 : 0)}%`, minHeight: d.total > 0 ? 2 : 0 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Counts by type */}
      {data && data.counts.byType.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.counts.byType.map((c) => (
            <button
              key={c.type}
              onClick={() => setFilters((p) => ({ ...p, type: p.type === c.type ? "" : c.type }))}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${
                filters.type === c.type
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {c.type}
              <span className="text-[10px] text-zinc-500 font-semibold">{c.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Filtrar por userId exacto"
            value={filters.userId}
            onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
          />
        </div>
        {(filters.type || filters.userId) && (
          <button
            onClick={() => setFilters({ type: "", userId: "" })}
            className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs text-zinc-300"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      {/* Events list */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">Sin eventos con estos filtros.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {data.items.map((item) => {
              const isExpanded = expanded === item.id;
              const hasMeta = item.metadata && Object.keys(item.metadata).length > 0;
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 w-[90px] mt-0.5">
                      {fmtDate(item.createdAt)}
                    </span>
                    <span className="rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-violet-300 shrink-0">
                      {item.type}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 truncate w-[130px]">
                      {item.userId.slice(0, 16)}…
                    </span>
                    <span className="text-xs text-zinc-400 flex-1 min-w-0 truncate">
                      {hasMeta ? JSON.stringify(item.metadata).slice(0, 100) : "—"}
                    </span>
                    {hasMeta && (
                      <span className="shrink-0 text-zinc-500 mt-0.5">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                    )}
                  </button>
                  {isExpanded && hasMeta && (
                    <div className="px-4 pb-4 pl-[108px]">
                      <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1 flex items-center gap-1">
                        <Code2 className="h-3 w-3" /> Metadata
                      </p>
                      <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-300 overflow-auto max-h-[300px]">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
