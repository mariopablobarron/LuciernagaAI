"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Info,
  RefreshCw,
  Shield,
  ShieldAlert,
  Activity,
  Bot,
  Building2,
  CreditCard,
  Brain,
  Users,
  Zap,
  Clock,
  Mail,
  Send,
  MailX,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Backup = {
  id: string;
  type: string;
  label: string | null;
  summary: string | null;
  recordCount: number;
  createdAt: string;
};

type Recommendation = {
  level: "info" | "warning" | "critical";
  message: string;
  area: string;
};

type Stats = {
  crisisCount7d: number;
  unverifiedCount: number;
  failedSubs: number;
  avoidance7d: number;
  avoidanceTrend: number;
  inactiveUsers: number;
  llmCalls7d: number;
  llmTokens7d: number;
  telegramUsers: number;
  orgCount: number;
};

type OpsData = {
  ok: boolean;
  backups: Backup[];
  stats: Stats;
  recommendations: Recommendation[];
};

type UnverifiedUser = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  createdAt: string;
  lastSeen: string;
  daysAgo: number;
  tokenStatus: "valid" | "expired" | "missing";
  tokenExpiresAt: string | null;
  hasGoogleId: boolean;
  messagesSent: number;
};

const LEVEL_CONFIG = {
  critical: {
    icon: ShieldAlert,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Critico",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "Atencion",
  },
  info: {
    icon: Info,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    label: "Info",
  },
};

const AREA_ICONS: Record<string, typeof Database> = {
  Backups: Database,
  Crisis: ShieldAlert,
  Auth: Shield,
  Billing: CreditCard,
  Engagement: Brain,
  Retencion: Users,
  Monitoring: Activity,
  Email: Zap,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  if (hrs < 1) return "hace menos de 1h";
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function OperacionesPage() {
  const router = useRouter();
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unverified, setUnverified] = useState<UnverifiedUser[] | null>(null);
  const [resending, setResending] = useState<string | "all" | null>(null);

  const loadUnverified = useCallback(() => {
    fetch("/api/admin/operations/unverified", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { users: UnverifiedUser[] } | null) => {
        if (d) setUnverified(d.users);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/operations", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.push("/admin/login");
          return null;
        }
        if (!r.ok) {
          toast.error(`Error ${r.status} al cargar operaciones`);
          return null;
        }
        return r.json();
      })
      .then((d: OpsData | null) => {
        if (d) setData(d);
      })
      .catch(() => {
        toast.error("Error al cargar operaciones");
      })
      .finally(() => setLoading(false));
    loadUnverified();
  }, [router, loadUnverified]);

  async function handleResend(userId: string | "all") {
    if (userId === "all" && !confirm("¿Reenviar verificación a todos los usuarios sin verificar?"))
      return;
    setResending(userId);
    try {
      const body = userId === "all" ? { all: true } : { userId };
      const res = await fetch("/api/admin/operations/unverified/resend", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (userId === "all") {
        const sent =
          json.results?.filter((r: { status: string }) => r.status === "sent").length ?? 0;
        const failed =
          json.results?.filter((r: { status: string }) => r.status === "send_failed").length ?? 0;
        toast.success(`Reenviados: ${sent}. Fallos: ${failed}.`);
      } else if (json.status === "sent") {
        toast.success("Correo reenviado");
      } else {
        toast.error(`No se pudo reenviar: ${json.status ?? json.error ?? "error"}`);
      }
      loadUnverified();
    } catch {
      toast.error("Error al reenviar");
    } finally {
      setResending(null);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function handleBackupNow() {
    const secret = prompt("CRON_SECRET para ejecutar backup:");
    if (!secret) return;
    window.open(`/api/admin/backup?secret=${encodeURIComponent(secret)}`, "_blank");
  }

  const criticalCount = data?.recommendations.filter((r) => r.level === "critical").length ?? 0;
  const warningCount = data?.recommendations.filter((r) => r.level === "warning").length ?? 0;

  return (
    <AdminShell
      title="Operaciones"
      subtitle="Backups, estado del sistema y recomendaciones operativas."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              {
                label: "Crisis 7d",
                value: data.stats.crisisCount7d,
                icon: ShieldAlert,
                alert: data.stats.crisisCount7d > 0,
              },
              {
                label: "Pagos fallidos",
                value: data.stats.failedSubs,
                icon: CreditCard,
                alert: data.stats.failedSubs > 0,
              },
              { label: "Inactivos 7d", value: data.stats.inactiveUsers, icon: Users, alert: false },
              { label: "Telegram", value: data.stats.telegramUsers, icon: Bot, alert: false },
              {
                label: "Organizaciones",
                value: data.stats.orgCount,
                icon: Building2,
                alert: false,
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className={`rounded-xl border p-4 ${m.alert ? "border-red-500/30 bg-red-500/5" : "border-zinc-800 bg-zinc-900/50"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${m.alert ? "text-red-400" : "text-zinc-500"}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {m.label}
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${m.alert ? "text-red-300" : "text-white"}`}>
                    {m.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-white">Recomendaciones del sistema</h2>
                {criticalCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    {criticalCount} critico{criticalCount > 1 ? "s" : ""}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {warningCount} atencion
                  </span>
                )}
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="p-1.5 text-zinc-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {data.recommendations.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-8 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  Todo en orden. Sin recomendaciones pendientes.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {data.recommendations.map((rec, i) => {
                  const config = LEVEL_CONFIG[rec.level];
                  const LevelIcon = config.icon;
                  const AreaIcon = AREA_ICONS[rec.area] ?? Activity;
                  return (
                    <div key={i} className={`flex items-start gap-3 px-5 py-4 ${config.bg}`}>
                      <LevelIcon className={`w-4 h-4 shrink-0 mt-0.5 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}
                          >
                            {config.label}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <AreaIcon className="w-3 h-3" /> {rec.area}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300">{rec.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unverified users */}
          {unverified && unverified.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Usuarios sin verificar email</h2>
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {unverified.length}
                  </span>
                </div>
                <button
                  onClick={() => handleResend("all")}
                  disabled={resending === "all"}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${resending === "all" ? "animate-pulse" : ""}`} />
                  {resending === "all" ? "Reenviando…" : "Reenviar a todos"}
                </button>
              </div>
              <div className="divide-y divide-amber-500/10">
                {unverified.map((u) => {
                  const statusConfig =
                    u.tokenStatus === "expired"
                      ? { icon: MailX, color: "text-red-300", label: "Token expirado" }
                      : u.tokenStatus === "missing"
                        ? { icon: MailX, color: "text-zinc-500", label: "Sin token" }
                        : { icon: Mail, color: "text-emerald-400", label: "Token válido" };
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-amber-500/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white truncate">{u.email}</p>
                          {u.name && <span className="text-xs text-zinc-500">— {u.name}</span>}
                          {u.hasGoogleId && (
                            <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-bold text-blue-300">
                              Google
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            hace {u.daysAgo}d
                          </span>
                          <span className={`flex items-center gap-1 ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                          {u.messagesSent > 0 && (
                            <span className="text-cyan-400">
                              {u.messagesSent} mensaje{u.messagesSent > 1 ? "s" : ""}
                            </span>
                          )}
                          {u.source && <span>desde {u.source}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleResend(u.id)}
                        disabled={resending !== null}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Send className={`w-3 h-3 ${resending === u.id ? "animate-pulse" : ""}`} />
                        {resending === u.id ? "…" : "Reenviar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LLM Usage mini */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  LLM calls 7d
                </span>
              </div>
              <p className="text-xl font-bold text-white">
                {data.stats.llmCalls7d.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-fuchsia-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Tokens 7d
                </span>
              </div>
              <p className="text-xl font-bold text-white">
                {data.stats.llmTokens7d.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Backups */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Historial de backups</h2>
              </div>
              <button
                onClick={handleBackupNow}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Backup ahora
              </button>
            </div>

            {data.backups.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Database className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No hay backups registrados.</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Configura el cron diario para tener copias automaticas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {data.backups.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm text-white">{b.label ?? `Backup ${b.type}`}</p>
                        <p className="text-xs text-zinc-500">
                          {b.summary ?? `${b.recordCount} registros`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-400">{formatDate(b.createdAt)}</p>
                      <p className="text-[10px] text-zinc-600">{formatRelative(b.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evitacion trend */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Evitaciones 7d</span>
              </div>
              <span
                className={`text-xs font-bold ${
                  data.stats.avoidanceTrend > 20
                    ? "text-red-400"
                    : data.stats.avoidanceTrend < -10
                      ? "text-emerald-400"
                      : "text-zinc-500"
                }`}
              >
                {data.stats.avoidanceTrend > 0 ? "+" : ""}
                {data.stats.avoidanceTrend}% vs semana anterior
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{data.stats.avoidance7d}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {data.stats.avoidanceTrend > 20
                ? "Subida significativa. Revisar si hay acciones demasiado ambiciosas."
                : data.stats.avoidanceTrend < -10
                  ? "Bajando. Los usuarios estan enfrentando mas."
                  : "Estable."}
            </p>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/admin/crisis", label: "Crisis", icon: ShieldAlert },
              { href: "/admin/llm-usage", label: "LLM Usage", icon: Zap },
              { href: "/admin/audit", label: "Auditoria", icon: Shield },
              { href: "/admin/analytics", label: "Analytics", icon: Activity },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm font-semibold text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all"
                >
                  <Icon className="w-4 h-4" /> {link.label}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
