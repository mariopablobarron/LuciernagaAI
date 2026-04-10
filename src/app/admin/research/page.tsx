"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, Archive, BarChart3, Brain, ChevronDown, ChevronUp,
  Clock, Database, Download, Eye, EyeOff, Flame, Heart, MessageCircle,
  RefreshCw, Shield, Sparkles, Target, TrendingUp, Users, Zap, X,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type KPIs = {
  totalUsers: number;
  signups7d: number; signupsDelta: number;
  messages7d: number; messagesDelta: number;
  checkins7d: number; checkinsDelta: number;
  conversations7d: number;
};

type StateDistribution = Record<string, number>;
type EmotionDistribution = Record<string, number>;

type RetentionCohort = {
  week: string; totalUsers: number;
  retention: Record<string, { count: number; rate: number }>;
};

type CrisisStats = {
  total: number; last24h: number; last7d: number; last30d: number;
  high24h: number; critical24h: number;
};

type ActiveCrisis = { email: string; crisisActivatedAt: string };

type LlmSummary = {
  requests: number; totalTokens: number; costUsd: number; avgLatencyMs: number;
};

type StuckUser = { email: string; name: string | null; daysSinceUpdate: number; state: string };

type FunnelStep = { label: string; count: number };

type TransformationPhases = Record<string, number>;

type SnapshotSummary = {
  id: string; type: string; label: string | null; summary: string | null;
  recordCount: number; createdAt: string;
};

// Widget config — what the user wants to see
type WidgetKey =
  | "kpis" | "funnel" | "states" | "emotions" | "retention"
  | "crisis" | "transformation" | "stuck" | "llm" | "snapshots";

const WIDGET_LABELS: Record<WidgetKey, { label: string; icon: typeof Activity }> = {
  kpis: { label: "KPIs semanales", icon: BarChart3 },
  funnel: { label: "Funnel de conversion", icon: TrendingUp },
  states: { label: "Estados del sistema", icon: Shield },
  emotions: { label: "Mapa emocional", icon: Heart },
  retention: { label: "Retencion por cohorte", icon: Users },
  crisis: { label: "Crisis activas", icon: AlertTriangle },
  transformation: { label: "Fases de transformacion", icon: Sparkles },
  stuck: { label: "Usuarios atascados", icon: Clock },
  llm: { label: "Uso LLM / Costes", icon: Zap },
  snapshots: { label: "Archivo de snapshots", icon: Archive },
};

const ALL_WIDGETS: WidgetKey[] = Object.keys(WIDGET_LABELS) as WidgetKey[];
const DEFAULT_VISIBLE: WidgetKey[] = ["kpis", "funnel", "states", "emotions", "retention", "crisis", "transformation", "stuck", "llm"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function pct(n: number, total: number) {
  return total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;
}

function delta(val: number) {
  if (val === 0) return <span className="text-zinc-500">—</span>;
  return val > 0
    ? <span className="text-emerald-400">+{val}</span>
    : <span className="text-red-400">{val}</span>;
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: React.ReactNode; icon: typeof Activity }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
      <div className="flex items-center gap-2 text-xs text-zinc-500"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const w = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-500">{value} ({pct(value, total)})</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();

  // Data
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [states, setStates] = useState<StateDistribution>({});
  const [emotions, setEmotions] = useState<EmotionDistribution>({});
  const [retention, setRetention] = useState<RetentionCohort[]>([]);
  const [crisisStats, setCrisisStats] = useState<CrisisStats | null>(null);
  const [activeCrises, setActiveCrises] = useState<ActiveCrisis[]>([]);
  const [transformation, setTransformation] = useState<TransformationPhases>({});
  const [stuckUsers, setStuckUsers] = useState<StuckUser[]>([]);
  const [llm7d, setLlm7d] = useState<LlmSummary | null>(null);
  const [llm30d, setLlm30d] = useState<LlmSummary | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<WidgetKey[]>(DEFAULT_VISIBLE);
  const [showConfig, setShowConfig] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const isVisible = (key: WidgetKey) => visible.includes(key);
  const toggleWidget = (key: WidgetKey) => {
    setVisible((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, retentionRes, emotionalRes, crisisRes, transformRes, llmRes, snapshotsRes] = await Promise.all([
        fetch("/api/admin/analytics").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/retention").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/emotional-model").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/crisis").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/transformation").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/llm-usage").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/insights/history").then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (analyticsRes) {
        setKpis({
          totalUsers: analyticsRes.kpis?.totalUsers ?? 0,
          signups7d: analyticsRes.kpis?.signups7d?.value ?? 0,
          signupsDelta: analyticsRes.kpis?.signups7d?.delta ?? 0,
          messages7d: analyticsRes.kpis?.messages7d?.value ?? 0,
          messagesDelta: analyticsRes.kpis?.messages7d?.delta ?? 0,
          checkins7d: analyticsRes.kpis?.checkins7d?.value ?? 0,
          checkinsDelta: analyticsRes.kpis?.checkins7d?.delta ?? 0,
          conversations7d: analyticsRes.kpis?.conversations7d?.value ?? 0,
        });
        setStates(analyticsRes.stateDistribution ?? {});
        setFunnel(analyticsRes.funnel ?? []);
      }

      if (retentionRes) setRetention(retentionRes.cohorts ?? []);
      if (emotionalRes) setEmotions(emotionalRes.emotions ?? {});
      if (crisisRes) {
        setCrisisStats(crisisRes.stats ?? null);
        setActiveCrises(crisisRes.activeCrises ?? []);
      }
      if (transformRes) {
        setTransformation(transformRes.phases ?? {});
        setStuckUsers(transformRes.stuckUsers ?? []);
      }
      if (llmRes) {
        setLlm7d(llmRes.summary?.["7d"] ?? null);
        setLlm30d(llmRes.summary?.["30d"] ?? null);
      }
      if (snapshotsRes) setSnapshots(snapshotsRes.snapshots ?? []);

      setLastRefresh(new Date());
    } catch {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleReset() {
    if (!confirm("Resetear historial de decisiones/insights? Los datos se archivan como snapshot.")) return;
    const res = await fetch("/api/admin/insights/history", { method: "DELETE" });
    if (res.ok) {
      toast.success("Historial reseteado y archivado");
      fetchAll();
    } else {
      toast.error("Error reseteando");
    }
  }

  function handleLogout() {
    fetch("/api/admin/logout", { method: "POST" }).then(() => router.replace("/admin/login"));
  }

  const totalStateUsers = Object.values(states).reduce((a, b) => a + b, 0);
  const totalEmotionUsers = Object.values(emotions).reduce((a, b) => a + b, 0);
  const totalTransformUsers = Object.values(transformation).reduce((a, b) => a + b, 0);

  const STATE_COLORS: Record<string, string> = {
    ACTIVO: "bg-emerald-500", ESTABLE: "bg-cyan-500", EVASIVO: "bg-amber-500",
    BLOQUEADO: "bg-red-500", CRISIS: "bg-red-600",
  };

  const EMOTION_COLORS: Record<string, string> = {
    calma: "bg-cyan-500", esperanza: "bg-emerald-500", alegria: "bg-amber-400",
    miedo: "bg-violet-500", tristeza: "bg-blue-500", frustracion: "bg-red-500",
    ansiedad: "bg-amber-500", confusion: "bg-zinc-500",
  };

  return (
    <AdminShell
      title="Observatorio de investigacion"
      subtitle="Vision completa de lo que ocurre con los usuarios — en tiempo real, configurable y reseteable"
      onLogout={handleLogout}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors">
            {showConfig ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Configurar widgets
          </button>
          <button onClick={handleReset} className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors">
            <Database className="h-3.5 w-3.5" /> Resetear periodo
          </button>
        </div>
        {lastRefresh && (
          <span className="text-[10px] text-zinc-600">Ultima actualizacion: {lastRefresh.toLocaleTimeString("es-ES")}</span>
        )}
      </div>

      {/* Widget config */}
      {showConfig && (
        <div className="card-surface rounded-xl border border-zinc-800 p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Widgets visibles</p>
          <div className="flex flex-wrap gap-2">
            {ALL_WIDGETS.map((key) => {
              const w = WIDGET_LABELS[key];
              const on = isVisible(key);
              const Icon = w.icon;
              return (
                <button
                  key={key}
                  onClick={() => toggleWidget(key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* KPIs */}
          {isVisible("kpis") && kpis && (
            <AdminPanel title="KPIs semanales" tooltip="Metricas clave de los ultimos 7 dias vs semana anterior">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={Users} label="Usuarios totales" value={kpis.totalUsers} />
                <StatCard icon={Users} label="Registros 7d" value={kpis.signups7d} sub={<>vs semana ant: {delta(kpis.signupsDelta)}</>} />
                <StatCard icon={MessageCircle} label="Mensajes 7d" value={kpis.messages7d} sub={<>vs semana ant: {delta(kpis.messagesDelta)}</>} />
                <StatCard icon={Flame} label="Check-ins 7d" value={kpis.checkins7d} sub={<>vs semana ant: {delta(kpis.checkinsDelta)}</>} />
              </div>
            </AdminPanel>
          )}

          {/* Funnel */}
          {isVisible("funnel") && funnel.length > 0 && (
            <AdminPanel title="Funnel de conversion" tooltip="Progresion: registro > primera conversacion > primer objetivo > primera accion completada">
              <div className="space-y-2">
                {funnel.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-48 text-xs text-zinc-300 truncate">{step.label}</span>
                    <div className="flex-1 h-6 bg-zinc-800 rounded-lg overflow-hidden">
                      <div
                        className="h-6 bg-violet-500/60 rounded-lg flex items-center px-2 text-[10px] font-semibold text-white transition-all"
                        style={{ width: `${funnel[0].count === 0 ? 0 : Math.round((step.count / funnel[0].count) * 100)}%` }}
                      >
                        {step.count}
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 w-10 text-right">{pct(step.count, funnel[0]?.count ?? 1)}</span>
                  </div>
                ))}
              </div>
            </AdminPanel>
          )}

          {/* States + Emotions side by side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {isVisible("states") && totalStateUsers > 0 && (
              <AdminPanel title="Estados del sistema" tooltip="Distribucion de estados conductuales de todos los usuarios">
                <div className="space-y-2">
                  {Object.entries(states).sort(([, a], [, b]) => b - a).map(([state, count]) => (
                    <BarRow key={state} label={state} value={count} total={totalStateUsers} color={STATE_COLORS[state] ?? "bg-zinc-600"} />
                  ))}
                </div>
              </AdminPanel>
            )}

            {isVisible("emotions") && totalEmotionUsers > 0 && (
              <AdminPanel title="Mapa emocional" tooltip="Distribucion de emociones primarias detectadas">
                <div className="space-y-2">
                  {Object.entries(emotions).sort(([, a], [, b]) => b - a).map(([emotion, count]) => (
                    <BarRow key={emotion} label={emotion} value={count} total={totalEmotionUsers} color={EMOTION_COLORS[emotion] ?? "bg-zinc-600"} />
                  ))}
                </div>
              </AdminPanel>
            )}
          </div>

          {/* Retention */}
          {isVisible("retention") && retention.length > 0 && (
            <AdminPanel title="Retencion por cohorte" tooltip="Porcentaje de usuarios que vuelven en D1, D3, D7, D14, D30 por semana de registro">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="px-3 py-2 text-left">Semana</th>
                      <th className="px-3 py-2 text-right">Usuarios</th>
                      <th className="px-3 py-2 text-right">D1</th>
                      <th className="px-3 py-2 text-right">D3</th>
                      <th className="px-3 py-2 text-right">D7</th>
                      <th className="px-3 py-2 text-right">D14</th>
                      <th className="px-3 py-2 text-right">D30</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {retention.slice(0, 12).map((c) => (
                      <tr key={c.week} className="hover:bg-zinc-900/50">
                        <td className="px-3 py-2 text-zinc-300">{c.week}</td>
                        <td className="px-3 py-2 text-right text-zinc-400">{c.totalUsers}</td>
                        {["D1", "D3", "D7", "D14", "D30"].map((m) => {
                          const r = c.retention[m];
                          const rate = r?.rate ?? 0;
                          const color = rate >= 50 ? "text-emerald-400" : rate >= 25 ? "text-amber-400" : rate >= 10 ? "text-orange-400" : "text-zinc-600";
                          return <td key={m} className={`px-3 py-2 text-right font-mono ${color}`}>{r ? `${Math.round(rate)}%` : "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminPanel>
          )}

          {/* Crisis */}
          {isVisible("crisis") && crisisStats && (
            <AdminPanel
              title="Crisis"
              tooltip="Eventos de crisis detectados por el sistema"
              headerRight={
                activeCrises.length > 0
                  ? <span className="text-xs font-semibold text-red-400">{activeCrises.length} activas ahora</span>
                  : <span className="text-xs text-emerald-400">Sin crisis activas</span>
              }
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={AlertTriangle} label="Ultimas 24h" value={crisisStats.last24h} sub={<>{crisisStats.critical24h} criticas, {crisisStats.high24h} altas</>} />
                <StatCard icon={AlertTriangle} label="Ultimos 7d" value={crisisStats.last7d} />
                <StatCard icon={AlertTriangle} label="Ultimos 30d" value={crisisStats.last30d} />
                <StatCard icon={AlertTriangle} label="Total historico" value={crisisStats.total} />
              </div>
              {activeCrises.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Usuarios en crisis ahora</p>
                  {activeCrises.map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2 text-xs">
                      <span className="text-zinc-300">{c.email}</span>
                      <span className="text-zinc-500">desde {formatDate(c.crisisActivatedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          )}

          {/* Transformation + Stuck side by side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {isVisible("transformation") && totalTransformUsers > 0 && (
              <AdminPanel title="Fases de transformacion" tooltip="En que fase del proceso de cambio estan los usuarios">
                <div className="space-y-2">
                  {Object.entries(transformation).sort(([, a], [, b]) => b - a).map(([phase, count]) => (
                    <BarRow key={phase} label={phase} value={count} total={totalTransformUsers} color="bg-violet-500" />
                  ))}
                </div>
              </AdminPanel>
            )}

            {isVisible("stuck") && (
              <AdminPanel title="Usuarios atascados" tooltip="Usuarios en fase bloqueo inactivos 7+ dias — candidatos a intervencion">
                {stuckUsers.length === 0 ? (
                  <p className="text-sm text-zinc-500">Ninguno detectado.</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {stuckUsers.map((u, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs">
                        <div>
                          <span className="text-zinc-300">{u.name || u.email}</span>
                          <span className="ml-2 text-zinc-600">{u.state}</span>
                        </div>
                        <span className="text-amber-400 font-semibold">{u.daysSinceUpdate}d inactivo</span>
                      </div>
                    ))}
                  </div>
                )}
              </AdminPanel>
            )}
          </div>

          {/* LLM Usage */}
          {isVisible("llm") && (llm7d || llm30d) && (
            <AdminPanel title="Uso LLM / Costes" tooltip="Consumo de tokens, coste y latencia del sistema de IA">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {llm7d && (
                  <>
                    <StatCard icon={Zap} label="Requests 7d" value={llm7d.requests} />
                    <StatCard icon={Brain} label="Tokens 7d" value={llm7d.totalTokens.toLocaleString()} />
                    <StatCard icon={Zap} label="Coste 7d" value={`$${llm7d.costUsd.toFixed(2)}`} />
                    <StatCard icon={Clock} label="Latencia media" value={`${llm7d.avgLatencyMs}ms`} />
                  </>
                )}
              </div>
              {llm30d && (
                <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                  <span>30d: {llm30d.requests} requests</span>
                  <span>{llm30d.totalTokens.toLocaleString()} tokens</span>
                  <span>${llm30d.costUsd.toFixed(2)}</span>
                </div>
              )}
            </AdminPanel>
          )}

          {/* Snapshots archive */}
          {isVisible("snapshots") && (
            <AdminPanel
              title="Archivo de snapshots"
              tooltip="Historico de periodos reseteados. Cada reset genera un archivo con decisiones e insights."
              headerRight={<span className="text-xs text-zinc-500">{snapshots.length} archivos</span>}
            >
              {snapshots.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin snapshots todavia. Se crean al resetear el periodo.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded bg-violet-500/15 px-2 py-0.5 font-semibold text-violet-300 border border-violet-500/30">{snap.type}</span>
                        <span className="text-white font-medium">{snap.label ?? `Snap ${snap.id.slice(0, 8)}`}</span>
                        <span className="text-zinc-500">{snap.recordCount} registros</span>
                        <span className="text-zinc-600">{formatDate(snap.createdAt)}</span>
                      </div>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/admin/snapshots/${snap.id}`);
                          if (res.ok) {
                            const json = await res.json();
                            const blob = new Blob([JSON.stringify(json.snapshot, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a"); a.href = url; a.download = `snapshot-${snap.id}.json`; a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                        className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors"
                        title="Descargar JSON"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          )}

        </div>
      )}
    </AdminShell>
  );
}
