"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Download,
  FileText,
  Mail,
  PlayCircle,
  RefreshCw,
  Search,
  Timer,
  Webhook,
  X,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

// ── Types ───────────────────────────────────────────────────────────────────

type SystemLogItem = {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  tag: string;
  message: string;
  context: Record<string, unknown> | null;
  userId: string | null;
  route: string | null;
  statusCode: number | null;
  durationMs: number | null;
  stack: string | null;
};

type SystemResponse = {
  items: SystemLogItem[];
  nextCursor: string | null;
  counts: {
    byLevel: { level: string; count: number }[];
    topTags: { tag: string; count: number }[];
  };
};

type EmailLogItem = {
  id: string;
  userId: string | null;
  to: string;
  template: string;
  subject: string;
  status: "queued" | "sent" | "failed" | "delivered" | "bounced" | "complained";
  providerId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  createdAt: string;
};

type EmailResponse = {
  items: EmailLogItem[];
  nextCursor: string | null;
  counts: {
    byStatus: { status: string; count: number }[];
    byTemplate: { template: string; count: number }[];
  };
};

type Tab = "system" | "email" | "cron" | "webhook";

type VolumeBucket = { hour: string; total: number; byKey: Record<string, number> };
type TimeseriesResponse = {
  system: VolumeBucket[];
  email: VolumeBucket[];
  cron: VolumeBucket[];
  webhook: VolumeBucket[];
};

type CronRunItem = {
  id: string;
  jobName: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  recordsProcessed: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
};

type CronResponse = {
  items: CronRunItem[];
  nextCursor: string | null;
  counts: {
    byStatus: { status: string; count: number }[];
    byJob: { jobName: string; count: number }[];
    lastPerJob: { jobName: string; startedAt: string; status: string; durationMs: number | null }[];
  };
};

type WebhookItem = {
  id: string;
  source: string;
  event: string | null;
  status: "received" | "processed" | "failed";
  signatureValid: boolean | null;
  statusCode: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  payload: unknown;
  receivedAt: string;
  processedAt: string | null;
};

type WebhookResponse = {
  items: WebhookItem[];
  nextCursor: string | null;
  counts: {
    byStatus: { status: string; count: number }[];
    bySource: { source: string; count: number }[];
    topEvents: { event: string | null; count: number }[];
  };
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelConfig(level: string) {
  switch (level) {
    case "error":
      return {
        icon: AlertCircle,
        color: "text-red-400",
        bg: "bg-red-500/10",
        ring: "ring-red-500/30",
      };
    case "warn":
      return {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        ring: "ring-amber-500/30",
      };
    default:
      return {
        icon: CheckCircle2,
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        ring: "ring-cyan-500/30",
      };
  }
}

function emailStatusConfig(status: string) {
  switch (status) {
    case "sent":
    case "delivered":
      return { color: "text-emerald-400", bg: "bg-emerald-500/10", label: status };
    case "failed":
    case "bounced":
    case "complained":
      return { color: "text-red-400", bg: "bg-red-500/10", label: status };
    case "queued":
      return { color: "text-zinc-400", bg: "bg-zinc-500/10", label: "en cola" };
    default:
      return { color: "text-zinc-400", bg: "bg-zinc-500/10", label: status };
  }
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LogsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("system");

  // System log state
  const [sysData, setSysData] = useState<SystemResponse | null>(null);
  const [sysLoading, setSysLoading] = useState(false);
  const [sysFilters, setSysFilters] = useState({
    level: "",
    tag: "",
    search: "",
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  // Email log state
  const [emailData, setEmailData] = useState<EmailResponse | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailFilters, setEmailFilters] = useState({
    status: "",
    template: "",
    to: "",
  });

  // Cron log state
  const [cronData, setCronData] = useState<CronResponse | null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronFilters, setCronFilters] = useState({ jobName: "", status: "" });
  const [cronExpanded, setCronExpanded] = useState<string | null>(null);

  // Webhook log state
  const [whData, setWhData] = useState<WebhookResponse | null>(null);
  const [whLoading, setWhLoading] = useState(false);
  const [whFilters, setWhFilters] = useState({ source: "", status: "" });
  const [whExpanded, setWhExpanded] = useState<string | null>(null);

  // Timeseries for volume chart
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);

  const loadTimeseries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs/timeseries", { credentials: "include" });
      if (!res.ok) return;
      setTimeseries(await res.json());
    } catch {
      // silent — chart is optional
    }
  }, []);

  useEffect(() => {
    void loadTimeseries();
    const id = setInterval(() => void loadTimeseries(), 60_000);
    return () => clearInterval(id);
  }, [loadTimeseries]);

  function exportCsv(kind: Tab, filters: Record<string, string>) {
    const params = new URLSearchParams({ format: "csv" });
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    window.open(`/api/admin/logs/${kind}?${params.toString()}`, "_blank");
  }

  const loadSys = useCallback(async () => {
    setSysLoading(true);
    try {
      const params = new URLSearchParams();
      if (sysFilters.level) params.set("level", sysFilters.level);
      if (sysFilters.tag) params.set("tag", sysFilters.tag);
      if (sysFilters.search) params.set("search", sysFilters.search);
      const res = await fetch(`/api/admin/logs/system?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setSysData(await res.json());
    } catch {
      toast.error("Error al cargar logs");
    } finally {
      setSysLoading(false);
    }
  }, [router, sysFilters]);

  const loadCron = useCallback(async () => {
    setCronLoading(true);
    try {
      const params = new URLSearchParams();
      if (cronFilters.jobName) params.set("jobName", cronFilters.jobName);
      if (cronFilters.status) params.set("status", cronFilters.status);
      const res = await fetch(`/api/admin/logs/cron?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setCronData(await res.json());
    } catch {
      toast.error("Error al cargar crons");
    } finally {
      setCronLoading(false);
    }
  }, [router, cronFilters]);

  const loadWebhook = useCallback(async () => {
    setWhLoading(true);
    try {
      const params = new URLSearchParams();
      if (whFilters.source) params.set("source", whFilters.source);
      if (whFilters.status) params.set("status", whFilters.status);
      const res = await fetch(`/api/admin/logs/webhook?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setWhData(await res.json());
    } catch {
      toast.error("Error al cargar webhooks");
    } finally {
      setWhLoading(false);
    }
  }, [router, whFilters]);

  const loadEmail = useCallback(async () => {
    setEmailLoading(true);
    try {
      const params = new URLSearchParams();
      if (emailFilters.status) params.set("status", emailFilters.status);
      if (emailFilters.template) params.set("template", emailFilters.template);
      if (emailFilters.to) params.set("to", emailFilters.to);
      const res = await fetch(`/api/admin/logs/email?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setEmailData(await res.json());
    } catch {
      toast.error("Error al cargar emails");
    } finally {
      setEmailLoading(false);
    }
  }, [router, emailFilters]);

  useEffect(() => {
    if (activeTab === "system") void loadSys();
    else if (activeTab === "email") void loadEmail();
    else if (activeTab === "cron") void loadCron();
    else if (activeTab === "webhook") void loadWebhook();
  }, [activeTab, loadSys, loadEmail, loadCron, loadWebhook]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Logs del sistema"
      subtitle="Eventos estructurados (sistema, errores, correos). Búsqueda y filtros persistidos en BD."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        {[
          { key: "system" as const, label: "Sistema", icon: FileText },
          { key: "email" as const, label: "Correos", icon: Mail },
          { key: "cron" as const, label: "Crons", icon: Timer },
          { key: "webhook" as const, label: "Webhooks", icon: Webhook },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                active
                  ? "border-violet-500 text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "system" && (
        <>
          {timeseries && (
            <VolumeChart
              buckets={timeseries.system}
              accent="violet"
              label="Volumen 24h (sistema)"
            />
          )}
          <SystemLogTab
            data={sysData}
            loading={sysLoading}
            filters={sysFilters}
            setFilters={setSysFilters}
            onReload={() => void loadSys()}
            onExport={() => exportCsv("system", sysFilters)}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        </>
      )}
      {activeTab === "email" && (
        <>
          {timeseries && (
            <VolumeChart
              buckets={timeseries.email}
              accent="emerald"
              label="Volumen 24h (correos)"
            />
          )}
          <EmailLogTab
            data={emailData}
            loading={emailLoading}
            filters={emailFilters}
            setFilters={setEmailFilters}
            onReload={() => void loadEmail()}
            onExport={() => exportCsv("email", emailFilters)}
          />
        </>
      )}
      {activeTab === "cron" && (
        <>
          {timeseries && (
            <VolumeChart buckets={timeseries.cron} accent="cyan" label="Volumen 24h (crons)" />
          )}
          <CronLogTab
            data={cronData}
            loading={cronLoading}
            filters={cronFilters}
            setFilters={setCronFilters}
            onReload={() => void loadCron()}
            onExport={() => exportCsv("cron", cronFilters)}
            expanded={cronExpanded}
            setExpanded={setCronExpanded}
          />
        </>
      )}
      {activeTab === "webhook" && (
        <>
          {timeseries && (
            <VolumeChart
              buckets={timeseries.webhook}
              accent="fuchsia"
              label="Volumen 24h (webhooks)"
            />
          )}
          <WebhookLogTab
            data={whData}
            loading={whLoading}
            filters={whFilters}
            setFilters={setWhFilters}
            onReload={() => void loadWebhook()}
            onExport={() => exportCsv("webhook", whFilters)}
            expanded={whExpanded}
            setExpanded={setWhExpanded}
          />
        </>
      )}
    </AdminShell>
  );
}

// ── Volume chart (sin librerías externas) ───────────────────────────────────

function VolumeChart({
  buckets,
  accent,
  label,
}: {
  buckets: VolumeBucket[];
  accent: "violet" | "emerald" | "cyan" | "fuchsia";
  label: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const total = buckets.reduce((acc, b) => acc + b.total, 0);
  const accentFill: Record<string, string> = {
    violet: "bg-violet-500/60 hover:bg-violet-400",
    emerald: "bg-emerald-500/60 hover:bg-emerald-400",
    cyan: "bg-cyan-500/60 hover:bg-cyan-400",
    fuchsia: "bg-fuchsia-500/60 hover:bg-fuchsia-400",
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zinc-400" />
          <p className="text-xs font-semibold uppercase text-zinc-400">{label}</p>
        </div>
        <p className="text-xs text-zinc-500">
          <span className="font-bold text-white">{total.toLocaleString()}</span> eventos · últimas
          24h
        </p>
      </div>
      <div className="flex items-end gap-0.5 h-20">
        {buckets.map((b) => {
          const heightPct = max === 0 ? 0 : (b.total / max) * 100;
          const d = new Date(b.hour);
          const h = String(d.getHours()).padStart(2, "0");
          return (
            <div
              key={b.hour}
              title={`${h}:00 — ${b.total}${
                Object.keys(b.byKey).length
                  ? "\n" +
                    Object.entries(b.byKey)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")
                  : ""
              }`}
              className="flex-1 flex flex-col justify-end group"
            >
              <div
                className={`${accentFill[accent]} rounded-t transition-all`}
                style={{
                  height: `${Math.max(heightPct, b.total > 0 ? 3 : 0)}%`,
                  minHeight: b.total > 0 ? 2 : 0,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600 mt-1 font-mono">
        <span>-24h</span>
        <span>-12h</span>
        <span>ahora</span>
      </div>
    </div>
  );
}

// ── System tab ──────────────────────────────────────────────────────────────

function SystemLogTab({
  data,
  loading,
  filters,
  setFilters,
  onReload,
  onExport,
  expanded,
  setExpanded,
}: {
  data: SystemResponse | null;
  loading: boolean;
  filters: { level: string; tag: string; search: string };
  setFilters: (
    fn: (prev: { level: string; tag: string; search: string }) => {
      level: string;
      tag: string;
      search: string;
    }
  ) => void;
  onReload: () => void;
  onExport: () => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {data.counts.byLevel.map((c) => {
            const cfg = levelConfig(c.level);
            const Icon = cfg.icon;
            return (
              <button
                key={c.level}
                onClick={() =>
                  setFilters((p) => ({ ...p, level: p.level === c.level ? "" : c.level }))
                }
                className={`flex items-center gap-3 rounded-xl border p-3 ${cfg.bg} ${
                  filters.level === c.level ? `ring-2 ${cfg.ring}` : "border-zinc-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${cfg.color}`} />
                <div className="text-left">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">{c.level}</p>
                  <p className="text-lg font-bold text-white">{c.count.toLocaleString()}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Buscar en mensaje…"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && onReload()}
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
          />
        </div>
        <select
          value={filters.tag}
          onChange={(e) => setFilters((p) => ({ ...p, tag: e.target.value }))}
          className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
        >
          <option value="">Todos los tags</option>
          {data?.counts.topTags.map((t) => (
            <option key={t.tag} value={t.tag}>
              {t.tag} ({t.count})
            </option>
          ))}
        </select>
        {(filters.level || filters.tag || filters.search) && (
          <button
            onClick={() => setFilters(() => ({ level: "", tag: "", search: "" }))}
            className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs text-zinc-300"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200"
          title="Descarga hasta 10.000 filas con los filtros actuales"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      {/* Log list */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Sin resultados. Prueba a cambiar filtros.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {data.items.map((item) => {
              const cfg = levelConfig(item.level);
              const Icon = cfg.icon;
              const isExpanded = expanded === item.id;
              return (
                <div key={item.id} className="flex flex-col">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors"
                  >
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 w-[90px] mt-0.5">
                      {fmtTime(item.timestamp)}
                    </span>
                    <span className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 shrink-0">
                      {item.tag}
                    </span>
                    <span className="text-sm text-zinc-200 flex-1 min-w-0 break-words">
                      {item.message}
                    </span>
                    {(item.context || item.stack) && (
                      <span className="shrink-0 text-zinc-500 mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </button>
                  {isExpanded && (item.context || item.stack) && (
                    <div className="px-4 pb-4 pl-[128px] space-y-2">
                      {item.context && Object.keys(item.context).length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">
                            Contexto
                          </p>
                          <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-300 overflow-auto max-h-[200px]">
                            {JSON.stringify(item.context, null, 2)}
                          </pre>
                        </div>
                      )}
                      {item.stack && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">
                            Stack trace
                          </p>
                          <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-400 overflow-auto max-h-[300px]">
                            {item.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Email tab ───────────────────────────────────────────────────────────────

function EmailLogTab({
  data,
  loading,
  filters,
  setFilters,
  onReload,
  onExport,
}: {
  data: EmailResponse | null;
  loading: boolean;
  filters: { status: string; template: string; to: string };
  setFilters: (
    fn: (prev: { status: string; template: string; to: string }) => {
      status: string;
      template: string;
      to: string;
    }
  ) => void;
  onReload: () => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-5">
      {data && data.counts.byStatus.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.counts.byStatus.map((c) => {
            const cfg = emailStatusConfig(c.status);
            return (
              <button
                key={c.status}
                onClick={() =>
                  setFilters((p) => ({ ...p, status: p.status === c.status ? "" : c.status }))
                }
                className={`flex items-center justify-between rounded-xl border p-3 ${cfg.bg} ${
                  filters.status === c.status ? "border-violet-500/50" : "border-zinc-800"
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-lg font-bold text-white">{c.count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Buscar por email…"
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && onReload()}
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
          />
        </div>
        <select
          value={filters.template}
          onChange={(e) => setFilters((p) => ({ ...p, template: e.target.value }))}
          className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
        >
          <option value="">Todas las plantillas</option>
          {data?.counts.byTemplate.map((t) => (
            <option key={t.template} value={t.template}>
              {t.template} ({t.count})
            </option>
          ))}
        </select>
        {(filters.status || filters.template || filters.to) && (
          <button
            onClick={() => setFilters(() => ({ status: "", template: "", to: "" }))}
            className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs text-zinc-300"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Sin correos registrados. Cuando envíes tu primer correo aparecerá aquí.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {data.items.map((item) => {
              const cfg = emailStatusConfig(item.status);
              return (
                <div key={item.id} className="px-4 py-3 hover:bg-zinc-900/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 w-[90px] mt-0.5">
                      {fmtTime(item.createdAt)}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 shrink-0">
                      {item.template}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{item.to}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.subject}</p>
                      {item.errorMessage && (
                        <p className="mt-1 text-xs text-red-400 break-words">{item.errorMessage}</p>
                      )}
                    </div>
                    {item.providerId && (
                      <span className="font-mono text-[10px] text-zinc-600 shrink-0 mt-0.5">
                        {item.providerId.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cron tab ────────────────────────────────────────────────────────────────

function CronLogTab({
  data,
  loading,
  filters,
  setFilters,
  onReload,
  onExport,
  expanded,
  setExpanded,
}: {
  data: CronResponse | null;
  loading: boolean;
  filters: { jobName: string; status: string };
  setFilters: (
    fn: (prev: { jobName: string; status: string }) => { jobName: string; status: string }
  ) => void;
  onReload: () => void;
  onExport: () => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const statusColors: Record<string, { color: string; bg: string }> = {
    success: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
    running: { color: "text-cyan-400", bg: "bg-cyan-500/10" },
    failed: { color: "text-red-400", bg: "bg-red-500/10" },
  };

  return (
    <div className="space-y-5">
      {data && data.counts.lastPerJob.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Última ejecución por job
            </p>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {data.counts.lastPerJob.map((j) => {
              const cfg = statusColors[j.status] ?? {
                color: "text-zinc-400",
                bg: "bg-zinc-500/10",
              };
              return (
                <button
                  key={j.jobName}
                  onClick={() =>
                    setFilters((p) => ({ ...p, jobName: p.jobName === j.jobName ? "" : j.jobName }))
                  }
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-900/40 transition-colors ${
                    filters.jobName === j.jobName ? "bg-zinc-900/60" : ""
                  }`}
                >
                  <PlayCircle className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                  <span className="font-mono text-xs text-zinc-200 flex-1 truncate">
                    {j.jobName}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}
                  >
                    {j.status}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 w-[110px] text-right">
                    {fmtTime(j.startedAt)}
                  </span>
                  {j.durationMs !== null && (
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0 w-[55px] text-right">
                      {j.durationMs < 1000
                        ? `${j.durationMs}ms`
                        : `${(j.durationMs / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {data && data.counts.byStatus.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {data.counts.byStatus.map((c) => {
            const cfg = statusColors[c.status] ?? { color: "text-zinc-400", bg: "bg-zinc-500/10" };
            return (
              <button
                key={c.status}
                onClick={() =>
                  setFilters((p) => ({ ...p, status: p.status === c.status ? "" : c.status }))
                }
                className={`flex items-center justify-between rounded-xl border p-3 ${cfg.bg} ${
                  filters.status === c.status ? "border-violet-500/50" : "border-zinc-800"
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${cfg.color}`}>
                  {c.status}
                </span>
                <span className="text-lg font-bold text-white">{c.count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.jobName}
          onChange={(e) => setFilters((p) => ({ ...p, jobName: e.target.value }))}
          className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
        >
          <option value="">Todos los jobs</option>
          {data?.counts.byJob.map((j) => (
            <option key={j.jobName} value={j.jobName}>
              {j.jobName} ({j.count})
            </option>
          ))}
        </select>
        {(filters.jobName || filters.status) && (
          <button
            onClick={() => setFilters(() => ({ jobName: "", status: "" }))}
            className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs text-zinc-300"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Sin ejecuciones registradas. Aparecerán aquí cuando corran los crons.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {data.items.map((item) => {
              const cfg = statusColors[item.status] ?? {
                color: "text-zinc-400",
                bg: "bg-zinc-500/10",
              };
              const isExpanded = expanded === item.id;
              return (
                <div key={item.id} className="flex flex-col">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 w-[110px] mt-0.5">
                      {fmtTime(item.startedAt)}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${cfg.bg} ${cfg.color}`}
                    >
                      {item.status}
                    </span>
                    <span className="font-mono text-xs text-zinc-200 flex-1 min-w-0 truncate">
                      {item.jobName}
                    </span>
                    {item.durationMs !== null && (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
                        <Clock className="h-3 w-3" />
                        {item.durationMs < 1000
                          ? `${item.durationMs}ms`
                          : `${(item.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                    {item.recordsProcessed !== null && (
                      <span className="text-[10px] text-cyan-400 shrink-0">
                        {item.recordsProcessed} rec
                      </span>
                    )}
                    {(item.metadata || item.errorMessage) && (
                      <span className="shrink-0 text-zinc-500 mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </button>
                  {isExpanded && (item.metadata || item.errorMessage) && (
                    <div className="px-4 pb-4 pl-[134px] space-y-2">
                      {item.errorMessage && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-red-400 mb-1">
                            Error
                          </p>
                          <pre className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 text-[11px] text-red-300 overflow-auto max-h-[200px]">
                            {item.errorMessage}
                          </pre>
                        </div>
                      )}
                      {item.metadata && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">
                            Metadata
                          </p>
                          <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-300 overflow-auto max-h-[200px]">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Webhook tab ─────────────────────────────────────────────────────────────

function WebhookLogTab({
  data,
  loading,
  filters,
  setFilters,
  onReload,
  onExport,
  expanded,
  setExpanded,
}: {
  data: WebhookResponse | null;
  loading: boolean;
  filters: { source: string; status: string };
  setFilters: (
    fn: (prev: { source: string; status: string }) => { source: string; status: string }
  ) => void;
  onReload: () => void;
  onExport: () => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const statusColors: Record<string, { color: string; bg: string }> = {
    processed: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
    received: { color: "text-cyan-400", bg: "bg-cyan-500/10" },
    failed: { color: "text-red-400", bg: "bg-red-500/10" },
  };

  return (
    <div className="space-y-5">
      {data && data.counts.bySource.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.counts.bySource.map((s) => (
            <button
              key={s.source}
              onClick={() =>
                setFilters((p) => ({ ...p, source: p.source === s.source ? "" : s.source }))
              }
              className={`flex items-center justify-between rounded-xl border p-3 ${
                filters.source === s.source
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <span className="text-[10px] font-semibold uppercase text-zinc-400">{s.source}</span>
              <span className="text-lg font-bold text-white">{s.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.status}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {data?.counts.byStatus.map((c) => (
            <option key={c.status} value={c.status}>
              {c.status} ({c.count})
            </option>
          ))}
        </select>
        {(filters.source || filters.status) && (
          <button
            onClick={() => setFilters(() => ({ source: "", status: "" }))}
            className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs text-zinc-300"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Sin webhooks registrados. Aparecerán aquí cuando entren eventos de Stripe o Telegram.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {data.items.map((item) => {
              const cfg = statusColors[item.status] ?? {
                color: "text-zinc-400",
                bg: "bg-zinc-500/10",
              };
              const isExpanded = expanded === item.id;
              return (
                <div key={item.id} className="flex flex-col">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 w-[110px] mt-0.5">
                      {fmtTime(item.receivedAt)}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${cfg.bg} ${cfg.color}`}
                    >
                      {item.status}
                    </span>
                    <span className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 shrink-0">
                      {item.source}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">
                        {item.event ?? "(sin evento)"}
                      </p>
                      {item.errorMessage && (
                        <p className="text-xs text-red-400 truncate">{item.errorMessage}</p>
                      )}
                    </div>
                    {item.signatureValid === false && (
                      <span className="rounded-md bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-300 shrink-0">
                        ⚠ firma
                      </span>
                    )}
                    {item.statusCode !== null && (
                      <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                        {item.statusCode}
                      </span>
                    )}
                    {item.durationMs !== null && (
                      <span className="text-[10px] text-zinc-500 shrink-0">
                        {item.durationMs < 1000
                          ? `${item.durationMs}ms`
                          : `${(item.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                    {Boolean(item.payload) && (
                      <span className="shrink-0 text-zinc-500 mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </button>
                  {isExpanded && Boolean(item.payload) && (
                    <div className="px-4 pb-4 pl-[134px]">
                      <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1 flex items-center gap-1">
                        <Code2 className="h-3 w-3" /> Payload
                      </p>
                      <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-300 overflow-auto max-h-[400px]">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
