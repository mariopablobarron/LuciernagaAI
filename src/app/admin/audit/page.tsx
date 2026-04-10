"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Filter,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

type AuditData = {
  stats: {
    totalEvents: number;
    eventsLast24h: number;
    eventsLast7d: number;
    uniqueEventTypes: number;
  };
  eventTypes: Array<{ type: string; count: number }>;
  events: {
    items: Array<{
      id: string;
      userId: string;
      type: string;
      metadata: Record<string, unknown> | null;
      createdAt: string;
      user: { email: string; name: string | null };
    }>;
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
  recentSnapshots: Array<{
    id: string;
    type: string;
    label: string | null;
    summary: string | null;
    recordCount: number | null;
    createdAt: string;
  }>;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const router = useRouter();
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (typeFilter) params.set("type", typeFilter);

    fetch(`/api/admin/audit?${params}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login?next=/admin/audit"); return null; }
        return r.json();
      })
      .then((d: AuditData | null) => { if (d) setData(d); })
      .catch(() => { toast.error("Error al cargar audit log"); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = data?.stats;
  const events = data?.events?.items ?? [];
  const pagination = data?.events?.pagination;
  const eventTypes = data?.eventTypes ?? [];
  const snapshots = data?.recentSnapshots ?? [];

  return (
    <AdminShell
      title="Audit Log"
      subtitle="Registro de eventos del sistema, actividad de usuarios y snapshots."
      showSectionNav={false}
      onLogout={async () => {
        await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
        router.replace("/admin/login");
      }}
    >
      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminMetricCard
          label="Total eventos"
          value={stats?.totalEvents ?? 0}
          accent="violet"
          icon={<Activity className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="Ultimas 24h"
          value={stats?.eventsLast24h ?? 0}
          accent="sky"
          icon={<Clock className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="Ultimos 7d"
          value={stats?.eventsLast7d ?? 0}
          accent="emerald"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="Tipos de evento"
          value={stats?.uniqueEventTypes ?? 0}
          accent="amber"
          icon={<Filter className="h-5 w-5" />}
        />
      </div>

      {/* ── Event types breakdown ─────────────────────────────────── */}
      {eventTypes.length > 0 && (
        <AdminPanel title="Tipos de evento">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setTypeFilter(""); setPage(1); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                !typeFilter
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                  : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Todos ({stats?.totalEvents ?? 0})
            </button>
            {eventTypes.slice(0, 15).map((t) => (
              <button
                key={t.type}
                onClick={() => { setTypeFilter(t.type); setPage(1); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  typeFilter === t.type
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                    : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t.type} ({t.count})
              </button>
            ))}
          </div>
        </AdminPanel>
      )}

      {/* ── Events list ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={load}
          className="rounded-xl border border-zinc-700 p-2.5 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          title="Refrescar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <p className="ml-auto text-xs text-zinc-600">
          {pagination ? `${pagination.total} eventos · pagina ${pagination.page}/${pagination.totalPages}` : "Cargando..."}
        </p>
      </div>

      <AdminPanel title="Eventos recientes">
        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-8 text-center">
            <Activity className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-400">No hay eventos para este filtro.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3 hover:bg-zinc-800/20 transition-colors">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-violet-500/50 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                      {event.type}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {event.user.name || event.user.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-zinc-700 ml-auto">{timeAgo(event.createdAt)}</span>
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <p className="text-[11px] text-zinc-600 mt-1 truncate">
                      {Object.entries(event.metadata).slice(0, 3).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-zinc-600">
              Pagina {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
              >
                Siguiente <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </AdminPanel>

      {/* ── Snapshots ─────────────────────────────────────────────── */}
      {snapshots.length > 0 && (
        <AdminPanel title="Snapshots recientes" tooltip="Copias de seguridad y capturas automaticas del estado del sistema.">
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                <Database className="h-4 w-4 text-zinc-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300">{s.label || s.type}</p>
                  {s.summary && <p className="text-xs text-zinc-600 truncate">{s.summary}</p>}
                </div>
                <div className="text-right shrink-0">
                  {s.recordCount != null && (
                    <p className="text-xs text-zinc-500">{s.recordCount} registros</p>
                  )}
                  <p className="text-[10px] text-zinc-700">{formatDate(s.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}
    </AdminShell>
  );
}
