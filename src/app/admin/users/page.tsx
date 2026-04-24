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
  Clock,
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

type UserKind = "registered" | "anon-active" | "anon-dormant" | "test" | "team";

type UserItem = {
  id: string;
  email: string;
  name: string | null;
  hasAvatar: boolean;
  role: string;
  kind: UserKind;
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
  usageMs7d: number;
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
  filters: { q: string; state: string; riskOnly: boolean; kind: string };
  kindCounts: Record<UserKind, number>;
};

type SortKey = "name" | "lastSeen" | "engagementScore" | "streakDays" | "state" | "messages7d" | "usageMs7d";
type SortDir = "asc" | "desc";

type SegmentId =
  | "active-real"
  | "at-risk"
  | "dormant-7d"
  | "no-activation"
  | "churn-30d"
  | "pro";

type SegmentPreset = {
  id: SegmentId;
  label: string;
  hint: string;
  filters: {
    kind?: UserKind;
    plan?: "pro" | "free";
    risk?: boolean;
    lastSeenToOffsetDays?: number; // lastSeen <= now - N days (dormant/churn)
    lastSeenFromOffsetDays?: number; // lastSeen >= now - N days (active)
    createdToOffsetDays?: number; // createdAt <= now - N days (no-activation, churn)
  };
};

const SEGMENT_PRESETS: SegmentPreset[] = [
  {
    id: "active-real",
    label: "Activos reales",
    hint: "Registrados/equipo con actividad en los últimos 7 días",
    filters: { kind: "registered", lastSeenFromOffsetDays: 7 },
  },
  {
    id: "at-risk",
    label: "En riesgo",
    hint: "Riesgo alto/crítico o crisis activa",
    filters: { risk: true },
  },
  {
    id: "dormant-7d",
    label: "Dormidos 7d+",
    hint: "Sin actividad hace más de 7 días",
    filters: { lastSeenToOffsetDays: 7 },
  },
  {
    id: "no-activation",
    label: "Sin activación",
    hint: "Registrados hace >3 días que aún no han escrito",
    filters: { kind: "registered", createdToOffsetDays: 3 },
  },
  {
    id: "churn-30d",
    label: "Churn 30d",
    hint: "Sin actividad hace más de 30 días",
    filters: { lastSeenToOffsetDays: 30 },
  },
  {
    id: "pro",
    label: "Pro",
    hint: "Plan Pro activo",
    filters: { plan: "pro" },
  },
];

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

const KIND_CONFIG: Record<UserKind, { label: string; style: string }> = {
  registered: { label: "Registrado", style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  "anon-active": { label: "Anónimo activo", style: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  "anon-dormant": { label: "Anónimo dormido", style: "bg-zinc-700/30 text-zinc-500 border-zinc-600/30" },
  test: { label: "Prueba", style: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  team: { label: "Equipo", style: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUsageMs(ms: number): string {
  if (!ms || ms < 60_000) return "—";
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 10) return `${hours}h ${minutes}m`;
  return `${hours}h`;
}

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
  const [kindFilter, setKindFilter] = useState<UserKind | "all">("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [segment, setSegment] = useState<SegmentId | null>(null);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [lastSeenFrom, setLastSeenFrom] = useState("");
  const [lastSeenTo, setLastSeenTo] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("lastSeen");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);
  const [bulkModal, setBulkModal] = useState<null | "tag" | "plan" | "email">(null);
  const [bulkScope, setBulkScope] = useState<"selection" | "filter">("selection");
  const [bulkTagAdd, setBulkTagAdd] = useState("");
  const [bulkTagRemove, setBulkTagRemove] = useState("");
  const [bulkPlan, setBulkPlan] = useState<"free" | "pro">("free");
  const [bulkPlanReason, setBulkPlanReason] = useState("");
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailBody, setBulkEmailBody] = useState("");

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

  function currentFilterPayload() {
    return {
      q: query.trim() || undefined,
      plan: planFilter !== "all" ? planFilter : undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      lastSeenFrom: lastSeenFrom || undefined,
      lastSeenTo: lastSeenTo || undefined,
    };
  }

  function bulkTargetPayload() {
    return bulkScope === "filter"
      ? { filter: currentFilterPayload() }
      : { userIds: Array.from(selected) };
  }

  async function handleBulkTag() {
    if (bulkScope === "selection" && selected.size === 0) return;
    const add = bulkTagAdd
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const remove = bulkTagRemove
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (add.length === 0 && remove.length === 0) {
      toast.error("Añade al menos un tag para añadir o quitar.");
      return;
    }
    setBulkAction(true);
    try {
      const res = await fetch("/api/admin/users/bulk-tag", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bulkTargetPayload(), add, remove }),
      });
      const payload = (await res.json().catch(() => ({}))) as { updated?: number };
      if (!res.ok) throw new Error("bulk_tag_failed");
      toast.success(`${payload.updated ?? 0} usuario(s) actualizados`);
      setBulkModal(null);
      setBulkTagAdd("");
      setBulkTagRemove("");
      setSelected(new Set());
      void fetchUsers();
    } catch {
      toast.error("No se pudo aplicar el tag masivo.");
    } finally {
      setBulkAction(false);
    }
  }

  async function handleBulkChangePlan() {
    if (bulkScope === "selection" && selected.size === 0) return;
    if (bulkPlanReason.trim().length < 10) {
      toast.error("Motivo requerido (mínimo 10 caracteres).");
      return;
    }
    const scopeLabel =
      bulkScope === "filter" ? "los usuarios del filtro actual" : `${selected.size} usuario(s)`;
    const confirmed = window.confirm(
      `¿Cambiar plan de ${scopeLabel} a ${bulkPlan}?\nEsta acción afecta facturación.`,
    );
    if (!confirmed) return;
    setBulkAction(true);
    try {
      const res = await fetch("/api/admin/users/bulk-change-plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bulkTargetPayload(),
          plan: bulkPlan,
          reason: bulkPlanReason.trim(),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { updated?: number };
      if (!res.ok) throw new Error("bulk_plan_failed");
      toast.success(`${payload.updated ?? 0} usuario(s) con plan ${bulkPlan}`);
      setBulkModal(null);
      setBulkPlanReason("");
      setSelected(new Set());
      void fetchUsers();
    } catch {
      toast.error("No se pudo cambiar el plan en masa.");
    } finally {
      setBulkAction(false);
    }
  }

  async function handleBulkEmail() {
    if (bulkScope === "selection" && selected.size === 0) return;
    if (!bulkEmailSubject.trim() || !bulkEmailBody.trim()) {
      toast.error("Asunto y cuerpo obligatorios.");
      return;
    }
    const scopeLabel =
      bulkScope === "filter" ? "los usuarios del filtro actual" : `${selected.size} usuario(s)`;
    const confirmed = window.confirm(
      `¿Enviar email a ${scopeLabel}?\nLos anónimos sin email real se saltan automáticamente.`,
    );
    if (!confirmed) return;
    setBulkAction(true);
    try {
      const res = await fetch("/api/admin/users/bulk-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bulkTargetPayload(),
          subject: bulkEmailSubject.trim(),
          body: bulkEmailBody.trim(),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        sent?: number;
        skipped?: number;
        failures?: number;
      };
      if (!res.ok) throw new Error("bulk_email_failed");
      toast.success(
        `Enviados ${payload.sent ?? 0} · Saltados ${payload.skipped ?? 0} · Fallos ${payload.failures ?? 0}`,
      );
      setBulkModal(null);
      setBulkEmailSubject("");
      setBulkEmailBody("");
      setSelected(new Set());
    } catch {
      toast.error("No se pudo enviar el email en masa.");
    } finally {
      setBulkAction(false);
    }
  }

  async function fetchUsers(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "25");
    if (query.trim()) params.set("q", query.trim());
    if (stateFilter !== "all") params.set("state", stateFilter);
    if (kindFilter !== "all") params.set("kind", kindFilter);
    if (riskOnly) params.set("risk", "1");
    if (planFilter !== "all") params.set("plan", planFilter);
    if (createdFrom) params.set("createdFrom", createdFrom);
    if (createdTo) params.set("createdTo", createdTo);
    if (lastSeenFrom) params.set("lastSeenFrom", lastSeenFrom);
    if (lastSeenTo) params.set("lastSeenTo", lastSeenTo);

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
      const payload = (await res.json().catch(() => null)) as
        | (AdminUsersResponse & { requiredPermission?: string; error?: string })
        | null;
      if (signal?.aborted) return;
      if (res.status === 403) {
        const required = payload?.requiredPermission || "users:read";
        throw new Error(
          `Tu rol no tiene permiso "${required}". Pide a un superadmin que actualice tu rol (admin, support o clinical para ver usuarios).`,
        );
      }
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
  }, [page, kindFilter]);

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

  function applySegment(id: SegmentId | null) {
    const next = id === segment ? null : id;
    setSegment(next);
    // Clear all fields that segments control; then apply the preset.
    setKindFilter("all");
    setPlanFilter("all");
    setRiskOnly(false);
    setCreatedFrom("");
    setCreatedTo("");
    setLastSeenFrom("");
    setLastSeenTo("");

    if (next) {
      const preset = SEGMENT_PRESETS.find((s) => s.id === next);
      if (preset) {
        const now = Date.now();
        if (preset.filters.kind) setKindFilter(preset.filters.kind);
        if (preset.filters.plan) setPlanFilter(preset.filters.plan);
        if (preset.filters.risk) setRiskOnly(true);
        if (preset.filters.lastSeenFromOffsetDays != null) {
          setLastSeenFrom(new Date(now - preset.filters.lastSeenFromOffsetDays * 86400000).toISOString());
        }
        if (preset.filters.lastSeenToOffsetDays != null) {
          setLastSeenTo(new Date(now - preset.filters.lastSeenToOffsetDays * 86400000).toISOString());
        }
        if (preset.filters.createdToOffsetDays != null) {
          setCreatedTo(new Date(now - preset.filters.createdToOffsetDays * 86400000).toISOString());
        }
      }
    }
    setPage(1);
    // fetchUsers reads state — defer to next tick so the setters above commit.
    setTimeout(() => void fetchUsers(), 0);
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
        case "usageMs7d":
          return dir * (a.usageMs7d - b.usageMs7d);
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
  const kindCounts = data?.kindCounts ?? { registered: 0, "anon-active": 0, "anon-dormant": 0, test: 0, team: 0 };
  const realUsers = kindCounts.registered + kindCounts["anon-active"];
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
            <button
              type="button"
              onClick={() => applySegment("active-real")}
              className={`card-surface rounded-xl border p-4 text-left transition ${
                segment === "active-real"
                  ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Reales</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{realUsers}</p>
              <p className="mt-1 text-[10px] text-zinc-600 tabular-nums">
                {kindCounts.registered} reg · {kindCounts["anon-active"]} anón · {totalUsers} total
              </p>
            </button>
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
            <button
              type="button"
              onClick={() => applySegment("at-risk")}
              className={`card-surface rounded-xl border p-4 text-left transition ${
                segment === "at-risk"
                  ? "border-amber-500/50 ring-1 ring-amber-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-amber-500/70">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Riesgo</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-400">{withRisk}</p>
            </button>
            <button
              type="button"
              onClick={() => applySegment("at-risk")}
              className={`card-surface rounded-xl border p-4 text-left transition ${
                segment === "at-risk"
                  ? "border-red-500/50 ring-1 ring-red-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-red-500/70">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Crisis</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-400">{withCrisis}</p>
            </button>
            <button
              type="button"
              onClick={() => applySegment("pro")}
              className={`card-surface rounded-xl border p-4 text-left transition ${
                segment === "pro"
                  ? "border-violet-500/50 ring-1 ring-violet-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-violet-500/70">
                <Flame className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wide">Pro</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-violet-400">{proUsers}</p>
            </button>
          </>
        )}
      </div>

      {/* ── Segment chips ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {SEGMENT_PRESETS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => applySegment(s.id)}
            title={s.hint}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              segment === s.id
                ? "border-violet-500/60 bg-violet-500/20 text-violet-100"
                : "border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {s.label}
          </button>
        ))}
        {segment && (
          <button
            type="button"
            onClick={() => applySegment(segment)}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Quitar segmento ✕
          </button>
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

          {/* Kind filter */}
          <select
            value={kindFilter}
            onChange={(e) => { setKindFilter(e.target.value as UserKind | "all"); setPage(1); }}
            className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">Todos los tipos</option>
            <option value="registered">Registrados</option>
            <option value="anon-active">Anónimos activos</option>
            <option value="anon-dormant">Anónimos dormidos</option>
            <option value="test">De prueba</option>
            <option value="team">Equipo</option>
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
          <a
            href={`/api/admin/users/export?${new URLSearchParams({
              ...(query.trim() ? { q: query.trim() } : {}),
              ...(planFilter !== "all" ? { plan: planFilter } : {}),
              ...(createdFrom ? { createdFrom } : {}),
              ...(createdTo ? { createdTo } : {}),
              ...(lastSeenFrom ? { lastSeenFrom } : {}),
              ...(lastSeenTo ? { lastSeenTo } : {}),
            }).toString()}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Exportar CSV del filtro actual"
          >
            <Download className="h-3.5 w-3.5" /> Exportar filtro
          </a>
          <button
            type="button"
            onClick={() => { setBulkScope("filter"); setBulkModal("tag"); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 px-3 py-2.5 text-xs text-violet-300 hover:bg-violet-500/10"
            title="Aplicar tag a todos los del filtro"
          >
            Tag ↗
          </button>
          <button
            type="button"
            onClick={() => { setBulkScope("filter"); setBulkModal("email"); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 px-3 py-2.5 text-xs text-cyan-300 hover:bg-cyan-500/10"
            title="Enviar email a todos los del filtro"
          >
            Email ↗
          </button>
        </div>

        {/* Advanced filters (collapsible) */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
        >
          {advancedOpen ? "▾ Ocultar filtros avanzados" : "▸ Filtros avanzados"}
        </button>
        {advancedOpen && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Registrado desde
              <input
                type="date"
                value={createdFrom ? createdFrom.slice(0, 10) : ""}
                onChange={(e) => setCreatedFrom(e.target.value ? new Date(e.target.value).toISOString() : "")}
                className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Registrado hasta
              <input
                type="date"
                value={createdTo ? createdTo.slice(0, 10) : ""}
                onChange={(e) => setCreatedTo(e.target.value ? new Date(e.target.value).toISOString() : "")}
                className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Último acceso desde
              <input
                type="date"
                value={lastSeenFrom ? lastSeenFrom.slice(0, 10) : ""}
                onChange={(e) => setLastSeenFrom(e.target.value ? new Date(e.target.value).toISOString() : "")}
                className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Último acceso hasta
              <input
                type="date"
                value={lastSeenTo ? lastSeenTo.slice(0, 10) : ""}
                onChange={(e) => setLastSeenTo(e.target.value ? new Date(e.target.value).toISOString() : "")}
                className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-200"
              />
            </label>
          </div>
        )}
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
              <div className="flex flex-wrap gap-2 ml-auto">
                <button
                  onClick={handleBulkExport}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="h-3 w-3" /> Exportar CSV
                </button>
                <button
                  onClick={() => setBulkModal("tag")}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-500/10 transition-colors"
                >
                  Etiquetas
                </button>
                <button
                  onClick={() => setBulkModal("plan")}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 transition-colors"
                >
                  Cambiar plan
                </button>
                <button
                  onClick={() => setBulkModal("email")}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                >
                  Enviar email
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
          <div className="hidden lg:grid lg:grid-cols-[auto_1.5fr_0.7fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr_auto] gap-3 border-b border-zinc-800 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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
            <button onClick={() => handleSort("usageMs7d")} className="text-left hover:text-zinc-300 transition-colors">
              Uso 7d <SortIcon col="usageMs7d" />
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
                  <div className="hidden lg:grid lg:grid-cols-[auto_1.5fr_0.7fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr_auto] items-center gap-3 px-4 py-3">
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
                    <div className="flex items-center gap-3 min-w-0">
                      {user.hasAvatar ? (
                        <img src={`/api/user/avatar/${user.id}`} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                          {user.name || user.email.split("@")[0]}
                        </p>
                        <p className="truncate text-xs text-zinc-600">{user.email}</p>
                      </div>
                    </div>

                    {/* State */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stateCfg.bg}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${stateCfg.dot}`} />
                        {stateCfg.label}
                      </span>
                    </div>

                    {/* Plan + Kind + Risk */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${planCfg.style}`}>
                        {planCfg.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${KIND_CONFIG[user.kind].style}`}
                        title={KIND_CONFIG[user.kind].label}
                      >
                        {KIND_CONFIG[user.kind].label}
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

                    {/* Usage 7d */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className={`h-3 w-3 ${user.usageMs7d > 0 ? "text-violet-300" : "text-zinc-700"}`} />
                      <span className={`font-semibold tabular-nums ${user.usageMs7d > 0 ? "text-zinc-300" : "text-zinc-600"}`}>
                        {formatUsageMs(user.usageMs7d)}
                      </span>
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
                          <Link href={`/admin/users/${user.id}`} className="min-w-0 flex-1 flex items-center gap-2.5">
                            {user.hasAvatar ? (
                              <img src={`/api/user/avatar/${user.id}`} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                                {(user.name || user.email)[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">{user.name || user.email.split("@")[0]}</p>
                              <p className="truncate text-xs text-zinc-600">{user.email}</p>
                            </div>
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
                          <span className={`${KIND_CONFIG[user.kind].style} rounded-full border px-2 py-0.5 text-[10px] font-semibold`}>{KIND_CONFIG[user.kind].label}</span>
                          <span>Eng: <strong className="text-zinc-300">{user.engagementScore}</strong></span>
                          <span>Msgs: <strong className="text-zinc-300">{user.counts.messages7d}</strong></span>
                          <span>Uso: <strong className={user.usageMs7d > 0 ? "text-violet-300" : "text-zinc-500"}>{formatUsageMs(user.usageMs7d)}</strong></span>
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

      {/* Bulk modals */}
      {bulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !bulkAction && setBulkModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-sm font-semibold text-white">
                {bulkModal === "tag" && "Editar etiquetas"}
                {bulkModal === "plan" && "Cambiar plan"}
                {bulkModal === "email" && "Enviar email"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {bulkModal === "tag" && "Separa varias etiquetas por coma. Minúsculas, guiones."}
                {bulkModal === "plan" && "El motivo queda registrado en el audit log. Cambiar a Pro afecta facturación."}
                {bulkModal === "email" && "Se envía solo a usuarios con email real y activo."}
              </p>
            </div>

            {/* Scope selector */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Aplicar a</p>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBulkScope("selection")}
                  disabled={selected.size === 0}
                  className={`flex-1 rounded-md border px-2.5 py-1.5 transition ${
                    bulkScope === "selection"
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                      : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Selección ({selected.size})
                </button>
                <button
                  type="button"
                  onClick={() => setBulkScope("filter")}
                  className={`flex-1 rounded-md border px-2.5 py-1.5 transition ${
                    bulkScope === "filter"
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                      : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Filtro completo (≤ 500)
                </button>
              </div>
              {bulkScope === "filter" && (
                <p className="text-[11px] text-amber-400/80">
                  Aplica a todos los usuarios que coincidan con el filtro actual, no solo los de esta página.
                  Cap de 500 para evitar operaciones incontroladas.
                </p>
              )}
            </div>

            {bulkModal === "tag" && (
              <div className="space-y-3">
                <label className="block text-xs text-zinc-400">
                  Añadir
                  <input
                    value={bulkTagAdd}
                    onChange={(e) => setBulkTagAdd(e.target.value)}
                    placeholder="vip, beta, onboarding"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Quitar
                  <input
                    value={bulkTagRemove}
                    onChange={(e) => setBulkTagRemove(e.target.value)}
                    placeholder="deprecated, churn"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>
            )}

            {bulkModal === "plan" && (
              <div className="space-y-3">
                <label className="block text-xs text-zinc-400">
                  Plan
                  <select
                    value={bulkPlan}
                    onChange={(e) => setBulkPlan(e.target.value as "free" | "pro")}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </label>
                <label className="block text-xs text-zinc-400">
                  Motivo (mín 10 caracteres)
                  <textarea
                    value={bulkPlanReason}
                    onChange={(e) => setBulkPlanReason(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>
            )}

            {bulkModal === "email" && (
              <div className="space-y-3">
                <label className="block text-xs text-zinc-400">
                  Asunto
                  <input
                    value={bulkEmailSubject}
                    onChange={(e) => setBulkEmailSubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    maxLength={150}
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Cuerpo
                  <textarea
                    value={bulkEmailBody}
                    onChange={(e) => setBulkEmailBody(e.target.value)}
                    rows={8}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    maxLength={5000}
                  />
                </label>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBulkModal(null)}
                disabled={bulkAction}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (bulkModal === "tag") void handleBulkTag();
                  if (bulkModal === "plan") void handleBulkChangePlan();
                  if (bulkModal === "email") void handleBulkEmail();
                }}
                disabled={bulkAction}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
              >
                {bulkAction ? "Procesando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
