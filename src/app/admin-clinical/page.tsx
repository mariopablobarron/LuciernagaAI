"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, ShieldAlert, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminShell } from "@/features/admin/components/AdminShell";
import type { ClinicalUserListItem, EmotionalState, RiskLevel } from "@/features/admin-clinical/types";

type ListResponse = {
  items: ClinicalUserListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

const STATE_LABELS: Record<EmotionalState, string> = {
  neutral: "Neutral",
  duda: "Duda",
  bloqueo: "Bloqueo",
  ansiedad: "Ansiedad",
  claridad: "Claridad",
};

const STATE_VARIANT: Record<EmotionalState, string> = {
  neutral: "secondary",
  duda: "warning",
  bloqueo: "warning",
  ansiedad: "danger",
  claridad: "success",
};

const RISK_VARIANT: Record<RiskLevel, "secondary" | "warning" | "danger"> = {
  low: "secondary",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

const STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "ansiedad", label: "Ansiedad" },
  { value: "bloqueo", label: "Bloqueo" },
  { value: "duda", label: "Duda" },
  { value: "claridad", label: "Claridad" },
  { value: "neutral", label: "Neutral" },
];

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function AdminClinicalPage() {
  const router = useRouter();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        state: stateFilter,
        risk: riskOnly ? "1" : "0",
        page: String(page),
        pageSize: "50",
      });
      const res = await fetch(`/api/admin-clinical/users?${params}`);
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json() as ListResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [stateFilter, riskOnly, page]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <AdminShell
      title="Panel clínico"
      subtitle="Monitorización de estados emocionales, riesgo e intervenciones."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            {STATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStateFilter(opt.value); setPage(1); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  stateFilter === opt.value
                    ? "border-violet-500/30 bg-violet-500 text-white"
                    : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:bg-zinc-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={riskOnly}
              onChange={(e) => { setRiskOnly(e.target.checked); setPage(1); }}
              className="rounded"
            />
            Solo riesgo alto/crítico
          </label>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Usuarios{data ? ` — ${data.pagination.total} total` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="flex items-center gap-2 p-6 text-sm text-destructive">
              <AlertTriangle className="size-4" /> {error}
            </div>
          )}
          {loading && !data && (
            <div className="p-6 text-sm text-zinc-500">Cargando...</div>
          )}
          {data && data.items.length === 0 && (
            <div className="p-6 text-sm text-zinc-500">Sin resultados.</div>
          )}
          {data && data.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Riesgo</th>
                    <th className="px-4 py-3 text-center">Crisis 7d</th>
                    <th className="px-4 py-3 text-center">Racha</th>
                    <th className="px-4 py-3 text-center">Intervenciones</th>
                    <th className="px-4 py-3 text-left">Última actividad</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((u) => (
                    <tr key={u.id} className="group hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.crisisActive && <ShieldAlert className="size-4 text-destructive" />}
                          <div>
                            <div className="font-medium text-white">{u.name ?? u.email}</div>
                            <div className="text-xs text-zinc-500 font-mono">{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATE_VARIANT[u.state] as "secondary"}>
                          {STATE_LABELS[u.state]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={RISK_VARIANT[u.riskLevel]}>
                          {u.riskLevel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={u.crisisEvents7d > 0 ? "font-bold text-destructive" : "text-zinc-500"}>
                          {u.crisisEvents7d}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-500">
                        {u.streakDays}d
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-zinc-500">
                          <User className="size-3" />
                          {u.interventions}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {formatRelative(u.lastSeen)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin-clinical/user/${u.id}`}
                          className="rounded-full bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4 text-sm">
              <span className="text-zinc-500">
                Página {data.pagination.page} de {data.pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >Anterior</Button>
                <Button
                  variant="outline" size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
