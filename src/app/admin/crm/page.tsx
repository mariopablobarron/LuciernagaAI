"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Search, Mail, Phone, MessageCircle, Bot,
  CheckCircle2, XCircle, Flame, ChevronLeft, ChevronRight,
  RefreshCw, Download, Brain,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type CrmUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
  lastSeen: string;
  emailVerified: boolean;
  hasTelegram: boolean;
  source: string;
  messageCount: number;
  streakDays: number;
  state: string;
  emotion: string;
  hasActiveGoal: boolean;
  plan: string;
  isActive: boolean;
};

type Segments = {
  all: number;
  verified: number;
  active7d: number;
  telegram: number;
  has_phone: number;
};

type CrmData = {
  ok: boolean;
  items: CrmUser[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  segments: Segments;
};

const SEGMENT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "verified", label: "Verificados" },
  { value: "unverified", label: "Sin verificar" },
  { value: "active7d", label: "Activos 7d" },
  { value: "active30d", label: "Activos 30d" },
  { value: "inactive", label: "Inactivos" },
  { value: "telegram", label: "Telegram" },
  { value: "has_phone", label: "Con telefono" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  if (hrs < 1) return "ahora";
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function CrmPage() {
  const router = useRouter();
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [page, setPage] = useState(1);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "50", search, segment });
    fetch(`/api/admin/crm?${params}`)
      .then((r) => { if (r.status === 401) { router.push("/admin/login"); return null; } return r.json(); })
      .then((d: CrmData | null) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, segment]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  function handleExportCsv() {
    if (!data?.items.length) return;
    const headers = ["Email", "Nombre", "Telefono", "Registro", "Ultima actividad", "Verificado", "Telegram", "Mensajes", "Racha", "Estado", "Plan"];
    const rows = data.items.map((u) => [
      u.email, u.name ?? "", u.phone ?? "", u.createdAt.split("T")[0],
      u.lastSeen.split("T")[0], u.emailVerified ? "Si" : "No",
      u.hasTelegram ? "Si" : "No", String(u.messageCount),
      String(u.streakDays), u.state, u.plan,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-${segment}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell
      title="CRM — Usuarios MVP"
      subtitle="Todos los usuarios registrados con sus datos de contacto, actividad y segmentacion."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Segment counts */}
      {data?.segments && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: data.segments.all, icon: Users },
            { label: "Verificados", value: data.segments.verified, icon: CheckCircle2 },
            { label: "Activos 7d", value: data.segments.active7d, icon: Flame },
            { label: "Telegram", value: data.segments.telegram, icon: Bot },
            { label: "Con telefono", value: data.segments.has_phone, icon: Phone },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{m.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{m.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email, nombre o telefono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {SEGMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSegment(opt.value); setPage(1); }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                segment === opt.value
                  ? "border-violet-500/30 bg-violet-500/15 text-violet-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCsv}
          disabled={!data?.items.length}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={load} disabled={loading} className="p-2 text-zinc-500 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Contacto</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Msgs</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Racha</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Registro</th>
                <th className="px-4 py-3 text-left">Actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-600">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-600">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                data?.items.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{u.name ?? u.email.split("@")[0]}</span>
                          {u.emailVerified ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-zinc-600" />
                          )}
                          {u.hasTelegram && <Bot className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <p className="text-xs text-zinc-500 font-mono">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-1">
                        {u.phone && (
                          <div className="flex items-center gap-1 text-xs text-zinc-400">
                            <Phone className="w-3 h-3" /> {u.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <Mail className="w-3 h-3" /> {u.source}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Brain className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs capitalize text-zinc-400">{u.state}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="text-xs text-zinc-400">{u.messageCount}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {u.streakDays > 0 ? (
                        <span className="text-xs font-semibold text-amber-400">{u.streakDays}d</span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-zinc-500">{formatDate(u.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500">{formatRelative(u.lastSeen)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-sm">
            <span className="text-xs text-zinc-500">
              {data.pagination.total} usuarios — pagina {data.pagination.page} de {data.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded border border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
