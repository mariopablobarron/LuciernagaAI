"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/features/admin/components/AdminShell";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserItem = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastSeen: string;
  state: string;
  riskLevel: string;
  crisisActive: boolean;
  plan: string;
  subscriptionStatus: string;
  profileTitle: string | null;
  streakDays: number;
  engagementScore: number;
  counts: {
    conversations: number;
    messages: number;
    goals: number;
    checkins7d: number;
    crisisEvents7d: number;
    avoidanceEvents7d: number;
    messages7d: number;
  };
};

type AdminUsersResponse = {
  items: UserItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filters: { q: string; state: string; riskOnly: boolean };
};

type SortKey = "name" | "lastSeen" | "engagementScore" | "streakDays" | "state" | "messages7d";
type SortDir = "asc" | "desc";

// ─── Config ──────────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  claridad: { label: "Claridad", dot: "bg-cyan-400", bg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  bloqueo: { label: "Bloqueo", dot: "bg-red-400", bg: "bg-red-500/10 text-red-300 border-red-500/30" },
  ansiedad: { label: "Ansiedad", dot: "bg-amber-400", bg: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  duda: { label: "Duda", dot: "bg-violet-400", bg: "bg-violet-500/10 text-violet-300 border-violet-500/30" },
  neutral: { label: "Neutral", dot: "bg-zinc-500", bg: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30" },
};

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Critico", color: "text-red-400" },
  high: { label: "Alto", color: "text-orange-400" },
  medium: { label: "Medio", color: "text-amber-400" },
  low: { label: "Bajo", color: "text-zinc-500" },
};

const PLAN_CONFIG: Record<string, { label: string; style: string }> = {
  pro: { label: "Pro", style: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  free: { label: "Free", style: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(value: string): string {
  const now = Date.now();
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function engagementColor(score: number): string {
  if (score >= 65) return "bg-emerald-500";
  if (score >= 35) return "bg-amber-400";
  return "bg-red-400";
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/60 ${className ?? ""}`} />;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter();

  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("lastSeen");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Eliminar ${selected.size} usuario(s)? Esta accion no se puede deshacer.`)) return;
    setBulkAction(true);
    let deleted = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
        if (res.ok) deleted++;
        else failed++;
      } catch { failed++; }
    }
    if (failed > 0) {
      toast.error(`${failed} usuario(s) no se pudieron eliminar (permiso insuficiente o error).`);
    }
    if (deleted > 0) {
      toast.success(`${deleted} usuario(s) eliminado(s)`);
    }
    setSelected(new Set());
    setBulkAction(false);
    void fetchUsers();
  }

  async function handleBulkExport() {
    const selectedUsers = users.filter((u) => selected.has(u.id));
    const csv = [
      "email,nombre,estado,plan,engagement,racha,ultimo_acceso",
      ...selectedUsers.map((u) =>
        `${u.email},${u.name ?? ""},${u.state},${u.plan},${u.engagementScore},${u.streakDays},${u.lastSeen}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedUsers.length} usuario(s) exportado(s)`);
  }

  async function fetchUsers(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "25");
    if (query.trim()) params.set("q", query.trim());
    if (stateFilter !== "all") params.set("state", stateFilter);
    if (riskOnly) params.set("risk", "1");

    try {
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
        signal,
      });
      if (signal?.aborted) return;
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/users");
        return;
      }
      const payload = (await res.json().catch(() => null)) as AdminUsersResponse | null;
      if (signal?.aborted) return;
      if (!res.ok || !payload) throw new Error("No se pudo cargar el listado.");
      setData(payload);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Error cargando usuarios.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchUsers(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } finally {
      router.replace("/admin/login");
    }
  }

  function applyFilters() {
    setPage(1);
    void fetchUsers();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Sort + filter client-side for plan filter
  const users = useMemo(() => {
    let items = data?.items ?? [];
    if (planFilter !== "all") {
      items = items.filter((u) => u.plan === planFilter);
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * (a.name ?? a.email).localeCompare(b.name ?? b.email);
        case "lastSeen":
          return dir * (new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime());
        case "engagementScore":
          return dir * (a.engagementScore - b.engagementScore);
        case "streakDays":
          return dir * (a.streakDays - b.streakDays);
        case "messages7d":
          return dir * (a.counts.messages7d - b.counts.messages7d);
        case "state":
          return dir * a.state.localeCompare(b.state);
        default:
          return 0;
      }
    });
  }, [data?.items, planFilter, sortKey, sortDir]);

  // KPIs
  const allItems = data?.items ?? [];
  const totalUsers = data?.pagination.total ?? 0;
  const withRisk = allItems.filter((u) => u.riskLevel === "high" || u.riskLevel === "critical").length;
  const withCrisis = allItems.filter((u) => u.crisisActive).length;
  const avgEngagement = allItems.length > 0
    ? Math.round(allItems.reduce((s, u) => s + u.engagementScore, 0) / allItems.length)
    : 0;
  const proUsers = allItems.filter((u) => u.plan === "pro").length;
  const activeToday = allItems.filter((u) => {
    const diff = Date.now() - new Date(u.lastSeen).getTime();
    return diff < 24 * 60 * 60 * 1000;
  }).length;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === "asc"
      ? <ArrowUp className="inline h-3 w-3 ml-0.5" />
      : <ArrowDown className="inline h-3 w-3 ml-0.5" />;
  }

  return (
    <AdminShell
      title="Usuarios"
      subtitle="Vista operativa completa: estado emocional, actividad, riesgo y contexto por usuario."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <div className="card-surface rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Total</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{totalUsers}</p>
            </div>
            <div className="card-surface rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Activos 24h</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{activeToday}</p>
            </div>
            <div className="card-surface rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Target className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Engagement</span>
              </div>
              <p className={`mt-2 text-2xl font-bold ${avgEngagement >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                {avgEngagement}%
              </p>
            </div>
            <div className="card-surface rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-xs text-amber-500/70">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Riesgo</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-400">{withRisk}</p>
            </div>
            <div className="card-surface rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-xs text-red-500/70">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Crisis</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-400">{withCrisis}</p>
            </div>
            <div className="card-surface rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-xs text-violet-500/70">
                <Flame className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Pro</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-violet-400">{proUsers}</p>
            </div>
          </>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="card-surface rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Buscar por email o nombre..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          {/* State filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="claridad">Claridad</option>
            <option value="bloqueo">Bloqueo</option>
            <option value="ansiedad">Ansiedad</option>
            <option value="duda">Duda</option>
            <option value="neutral">Neutral</option>
          </select>

          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">Todos los planes</option>
            <option value="pro">Pro</option>
            <option value="free">Free</option>
          </select>

          {/* Risk toggle */}
          <button
            onClick={() => { setRiskOnly(!riskOnly); setTimeout(applyFilters, 0); }}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
              riskOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ShieldAlert className="mr-1.5 inline h-3.5 w-3.5" />
            Solo riesgo
          </button>

          {/* Actions */}
          <button
            onClick={applyFilters}
            className="rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-violet-400 hover:to-fuchsia-400 transition-all"
          >
            Buscar
          </button>
          <button
            onClick={() => void fetchUsers()}
            className="rounded-xl border border-zinc-700 p-2.5 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            title="Refrescar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── User Table ──────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="card-surface rounded-xl border border-zinc-800 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No hay usuarios para el filtro actual.</p>
        </div>
      ) : (
        <div className="card-surface overflow-hidden rounded-xl border border-zinc-800">
          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 border-b border-violet-500/20 bg-violet-500/5 px-4 py-2.5">
              <span className="text-xs font-semibold text-violet-300">
                {selected.size} seleccionado{selected.size > 1 ? "s" : ""}
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={handleBulkExport}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="h-3 w-3" /> Exportar CSV
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkAction}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" /> Eliminar
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Table header */}
          <div className="hidden lg:grid lg:grid-cols-[auto_1.5fr_0.7fr_0.6fr_0.5fr_0.5fr_0.5fr_0.4fr_auto] gap-3 border-b border-zinc-800 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <button onClick={toggleSelectAll} className="flex items-center justify-center w-6" title="Seleccionar todos">
              <div className={`h-4 w-4 rounded border transition-colors ${selected.size === users.length && users.length > 0 ? "bg-violet-500 border-violet-500" : "border-zinc-600 hover:border-zinc-400"}`}>
                {selected.size === users.length && users.length > 0 && <Check className="h-3 w-3 text-white mx-auto" />}
              </div>
            </button>
            <button onClick={() => handleSort("name")} className="text-left hover:text-zinc-300 transition-colors">
              Usuario <SortIcon col="name" />
            </button>
            <button onClick={() => handleSort("state")} className="text-left hover:text-zinc-300 transition-colors">
              Estado <SortIcon col="state" />
            </button>
            <span>Plan / Riesgo</span>
            <button onClick={() => handleSort("engagementScore")} className="text-left hover:text-zinc-300 transition-colors">
              Engagement <SortIcon col="engagementScore" />
            </button>
            <button onClick={() => handleSort("messages7d")} className="text-left hover:text-zinc-300 transition-colors">
              Msgs 7d <SortIcon col="messages7d" />
            </button>
            <button onClick={() => handleSort("streakDays")} className="text-left hover:text-zinc-300 transition-colors">
              Racha <SortIcon col="streakDays" />
            </button>
            <button onClick={() => handleSort("lastSeen")} className="text-left hover:text-zinc-300 transition-colors">
              Visto <SortIcon col="lastSeen" />
            </button>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-800/50">
            {users.map((user) => {
              const stateCfg = STATE_CONFIG[user.state] ?? STATE_CONFIG.neutral;
              const riskCfg = RISK_CONFIG[user.riskLevel] ?? RISK_CONFIG.low;
              const planCfg = PLAN_CONFIG[user.plan] ?? PLAN_CONFIG.free;

              return (
                <div
                  key={user.id}
                  className="group block transition-colors hover:bg-zinc-800/30"
                >
                  {/* Desktop row */}
                  <div className="hidden lg:grid lg:grid-cols-[auto_1.5fr_0.7fr_0.6fr_0.5fr_0.5fr_0.5fr_0.4fr_auto] items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(user.id); }}
                      className="flex items-center justify-center w-6"
                    >
                      <div className={`h-4 w-4 rounded border transition-colors ${selected.has(user.id) ? "bg-violet-500 border-violet-500" : "border-zinc-700 group-hover:border-zinc-500"}`}>
                        {selected.has(user.id) && <Check className="h-3 w-3 text-white mx-auto" />}
                      </div>
                    </button>
                    {/* User */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                        {user.name || user.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-zinc-600">{user.email}</p>
                    </div>

                    {/* State */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stateCfg.bg}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${stateCfg.dot}`} />
                        {stateCfg.label}
                      </span>
                    </div>

                    {/* Plan + Risk */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${planCfg.style}`}>
                        {planCfg.label}
                      </span>
                      {(user.riskLevel === "high" || user.riskLevel === "critical") && (
                        <span className={`text-[10px] font-semibold ${riskCfg.color}`}>
                          {riskCfg.label}
                        </span>
                      )}
                      {user.crisisActive && (
                        <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                      )}
                    </div>

                    {/* Engagement */}
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${engagementColor(user.engagementScore)}`}
                          style={{ width: `${user.engagementScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-zinc-300 tabular-nums">
                        {user.engagementScore}
                      </span>
                    </div>

                    {/* Messages 7d */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <MessageCircle className="h-3 w-3" />
                      <span className="font-semibold tabular-nums">{user.counts.messages7d}</span>
                    </div>

                    {/* Streak */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Flame className={`h-3 w-3 ${user.streakDays > 0 ? "text-amber-400" : "text-zinc-700"}`} />
                      <span className={`font-semibold tabular-nums ${user.streakDays > 0 ? "text-amber-300" : "text-zinc-600"}`}>
                        {user.streakDays}d
                      </span>
                    </div>

                    {/* Last seen */}
                    <span className="text-xs text-zinc-600 tabular-nums">{timeAgo(user.lastSeen)}</span>

                    {/* Arrow → detail */}
                    <Link href={`/admin/users/${user.id}`} className="p-1 rounded-lg hover:bg-zinc-700/50 transition-colors">
                      <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-violet-400 transition-colors" />
                    </Link>
                  </div>

                  {/* Mobile card */}
                  <div className="lg:hidden space-y-3 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSelect(user.id)}
                        className="mt-1 shrink-0"
                      >
                        <div className={`h-4 w-4 rounded border transition-colors ${selected.has(user.id) ? "bg-violet-500 border-violet-500" : "border-zinc-700"}`}>
                          {selected.has(user.id) && <Check className="h-3 w-3 text-white mx-auto" />}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <Link href={`/admin/users/${user.id}`} className="min-w-0 flex-1">
                            <p className="truncate font-medium text-white">{user.name || user.email.split("@")[0]}</p>
                            <p className="truncate text-xs text-zinc-600">{user.email}</p>
                          </Link>
                          <div className="flex items-center gap-1.5 ml-3">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stateCfg.bg}`}>
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${stateCfg.dot}`} />
                              {stateCfg.label}
                            </span>
                            {user.crisisActive && <ShieldAlert className="h-3.5 w-3.5 text-red-400" />}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mt-2">
                          <span className={`${planCfg.style} rounded-full border px-2 py-0.5 text-[10px] font-semibold`}>{planCfg.label}</span>
                          <span>Eng: <strong className="text-zinc-300">{user.engagementScore}</strong></span>
                          <span>Msgs: <strong className="text-zinc-300">{user.counts.messages7d}</strong></span>
                          <span>Racha: <strong className={user.streakDays > 0 ? "text-amber-300" : "text-zinc-500"}>{user.streakDays}d</strong></span>
                          <span>Visto: {timeAgo(user.lastSeen)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {!loading && data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-600">
            Página {data.pagination.page} de {data.pagination.totalPages} · {data.pagination.total} usuarios
          </p>
          <div className="flex gap-2">
            <button
              disabled={data.pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <button
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
