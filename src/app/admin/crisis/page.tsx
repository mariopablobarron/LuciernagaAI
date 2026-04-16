"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Shield,
  ShieldAlert,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

type PeriodStats = { total: number; high: number; critical: number };

type CrisisData = {
  stats: {
    totalAllTime: number;
    last24h: PeriodStats;
    last7d: PeriodStats;
    last30d: PeriodStats;
  };
  activeCrises: Array<{
    userId: string;
    email: string;
    name: string | null;
    crisisActivatedAt: string | null;
    crisisActiveUntil: string | null;
  }>;
  events: Array<{
    id: string;
    userId: string;
    email: string;
    name: string | null;
    level: string;
    message: string;
    response: string;
    createdAt: string;
  }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  usersWithoutContact: number;
  familyNotified: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminCrisisPage() {
  const router = useRouter();
  const [data, setData] = useState<CrisisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState("");

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (levelFilter) params.set("level", levelFilter);

    fetch(`/api/admin/crisis?${params}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login?next=/admin/crisis"); return null; }
        return r.json();
      })
      .then((d: CrisisData | null) => { if (d) setData(d); })
      .catch(() => { toast.error("Error al cargar datos de crisis"); })
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- legitimate fetch-on-filter-change; setLoading is UI feedback, not derived state
  useEffect(() => { load(); }, [page, levelFilter]);

  const stats = data?.stats;
  const active = data?.activeCrises ?? [];
  const events = data?.events ?? [];
  const pagination = data?.pagination;

  return (
    <AdminShell
      title="Crisis Management"
      subtitle="Eventos de crisis, usuarios en riesgo y estado de red de apoyo."
      showSectionNav={false}
      onLogout={async () => {
        await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
        router.replace("/admin/login");
      }}
    >
      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <AdminMetricCard
          label="Activos ahora"
          value={active.length}
          accent={active.length > 0 ? "rose" : "emerald"}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="24h"
          value={stats?.last24h.total ?? 0}
          accent={stats?.last24h.critical ? "rose" : "slate"}
          hint={`${stats?.last24h.critical ?? 0} criticos`}
          icon={<Clock className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="7 dias"
          value={stats?.last7d.total ?? 0}
          accent="amber"
          hint={`${stats?.last7d.high ?? 0} altos, ${stats?.last7d.critical ?? 0} criticos`}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="30 dias"
          value={stats?.last30d.total ?? 0}
          accent="violet"
          icon={<Shield className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="Sin red de apoyo"
          value={data?.usersWithoutContact ?? 0}
          accent={data?.usersWithoutContact ? "rose" : "emerald"}
          hint="Usuarios en crisis sin contacto de confianza"
          icon={<UserX className="h-5 w-5" />}
        />
        <AdminMetricCard
          label="Familia notificada"
          value={data?.familyNotified ?? 0}
          accent="emerald"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* ── Active crises ─────────────────────────────────────────── */}
      {active.length > 0 && (
        <AdminPanel title={`Crisis activas (${active.length})`}>
          <div className="space-y-2">
            {active.map((c) => (
              <div key={c.userId} className="flex items-center justify-between gap-3 rounded-xl border-2 border-red-500/30 bg-red-500/5 p-4">
                <div className="min-w-0">
                  <Link href={`/admin/users/${c.userId}`} className="text-sm font-semibold text-red-300 hover:text-red-200 transition-colors">
                    {c.name || c.email}
                  </Link>
                  <p className="text-xs text-zinc-500 truncate">{c.email}</p>
                  {c.crisisActivatedAt && (
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Activada: {formatDate(c.crisisActivatedAt)}
                      {c.crisisActiveUntil && ` · Expira: ${formatDate(c.crisisActiveUntil)}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/admin/users/${c.userId}`}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Ver ficha
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
        >
          <option value="">Todos los niveles</option>
          <option value="critical">Critico</option>
          <option value="high">Alto</option>
          <option value="medium">Medio</option>
        </select>
        <button
          onClick={load}
          className="rounded-xl border border-zinc-700 p-2.5 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          title="Refrescar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <p className="ml-auto text-xs text-zinc-600">
          {pagination ? `${pagination.total} eventos totales` : "Cargando..."}
        </p>
      </div>

      {/* ── Events table ──────────────────────────────────────────── */}
      <AdminPanel title="Historial de eventos">
        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/50" />
            <p className="mt-3 text-sm text-zinc-400">No hay eventos de crisis para este filtro.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={`rounded-xl border-l-4 p-4 ${
                  event.level === "critical"
                    ? "border-l-red-500 bg-red-500/5"
                    : event.level === "high"
                      ? "border-l-orange-500 bg-orange-500/5"
                      : "border-l-amber-500 bg-amber-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/admin/users/${event.userId}`}
                        className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {event.name || event.email.split("@")[0]}
                      </Link>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        event.level === "critical"
                          ? "bg-red-500/20 text-red-400"
                          : event.level === "high"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {event.level === "critical" ? "CRITICO" : event.level === "high" ? "ALTO" : "MEDIO"}
                      </span>
                      <span className="text-[10px] text-zinc-600">{timeAgo(event.createdAt)}</span>
                    </div>
                    <p className="text-sm text-zinc-200">{event.message}</p>
                    {event.response && (
                      <p className="text-xs text-zinc-500 mt-1">Respuesta: {event.response}</p>
                    )}
                  </div>
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

      {/* ── Protocol ──────────────────────────────────────────────── */}
      <AdminPanel title="Protocolo de respuesta">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <p className="font-semibold text-red-400">Nivel CRITICO</p>
            <ul className="space-y-1 text-zinc-400 text-xs">
              <li>1. Notificar inmediatamente al profesional asignado</li>
              <li>2. Contactar a la red de apoyo (si existe)</li>
              <li>3. Proporcionar numeros de emergencia (024, 112)</li>
              <li>4. Documentar en ficha del usuario</li>
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <p className="font-semibold text-orange-400">Nivel ALTO</p>
            <ul className="space-y-1 text-zinc-400 text-xs">
              <li>1. Revisar mensajes del usuario en las ultimas 24h</li>
              <li>2. Evaluar si requiere escalada a critico</li>
              <li>3. Considerar notificar a red de apoyo</li>
              <li>4. Seguimiento en 24-48h</li>
            </ul>
          </div>
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
