"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import {
  RotateCw,
  Save,
  Video,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Target,
  Flag,
  Compass,
  Send,
  Megaphone,
  Users,
  Sparkles,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type AvatarConfig = {
  id: string;
  enabled: boolean;
  maxVideosPerDay: number;
  midpointMinDays: number;
  maxBroadcastsPerMonth: number;
  broadcastUserCooldownDays: number;
  welcomeCampaignId: string | null;
  tone: string;
  avatarId: string;
  promptTemplateStart: string;
  promptTemplateMidpoint: string;
  promptTemplateEnd: string;
  updatedAt: string;
  updatedBy: string | null;
};

type BroadcastLimits = {
  monthlyCount: number;
  monthlyCap: number;
  monthlyRemaining: number;
  cooldownDays: number;
  lastBroadcastAt: string | null;
};

const HEYGEN_COST_PER_VIDEO = 0.1; // approximate USD per generated video

type VideoEntry = {
  id: string;
  userId: string;
  goalId: string;
  phase: "START" | "MIDPOINT" | "END";
  trigger: string;
  script: string;
  status: "PENDING" | "READY" | "FAILED";
  videoUrl: string | null;
  errorMessage: string | null;
  seenAt: string | null;
  createdAt: string;
  user: { email: string; name: string | null };
  goal: { title: string };
};

type HistoryResponse = {
  entries: VideoEntry[];
  counts: Record<string, number>;
  countsByPhase: Record<string, number>;
  optedOutCount: number;
  lastDayCount: number;
};

// ── Broadcast types ─────────────────────────────────────────────────────────

type BroadcastMode = "literal" | "briefing";

type BroadcastCampaign = {
  id: string;
  title: string;
  segment: string;
  mode: BroadcastMode;
  isShared: boolean;
  literalScript: string | null;
  briefing: string | null;
  sharedVideoUrl: string | null;
  status: "PENDING" | "GENERATING" | "READY" | "FAILED";
  errorMessage: string | null;
  recipientCount: number;
  createdAt: string;
  createdBy: string | null;
  deliveryCounts: Record<string, number>;
};

const BROADCAST_SEGMENTS = [
  { value: "single", label: "Usuario individual" },
  { value: "all", label: "Todos" },
  { value: "active_7d", label: "Activos 7d" },
  { value: "inactive_7d", label: "Inactivos 7d+" },
  { value: "pro", label: "Pro" },
  { value: "free", label: "Free" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function phaseBadge(phase: VideoEntry["phase"]) {
  const map = {
    START: {
      label: "Inicio",
      icon: Flag,
      classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    MIDPOINT: {
      label: "Medio",
      icon: Compass,
      classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    END: {
      label: "Final",
      icon: Target,
      classes: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    },
  };
  return map[phase] ?? map.START;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AvatarVideosAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AvatarConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState<null | "midpoint-scan" | "poll">(null);
  const [history, setHistory] = useState<VideoEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsByPhase, setCountsByPhase] = useState<Record<string, number>>({});
  const [optedOutCount, setOptedOutCount] = useState(0);
  const [lastDayCount, setLastDayCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Broadcast state
  const [bcTitle, setBcTitle] = useState("");
  const [bcSegment, setBcSegment] = useState("single");
  const [bcUserEmail, setBcUserEmail] = useState("");
  const [bcMode, setBcMode] = useState<BroadcastMode>("literal");
  const [bcLiteralScript, setBcLiteralScript] = useState("");
  const [bcBriefing, setBcBriefing] = useState("");
  const [bcIsShared, setBcIsShared] = useState(true);
  const [bcSending, setBcSending] = useState(false);
  const [bcConfirm, setBcConfirm] = useState(false);
  const [bcSegmentCount, setBcSegmentCount] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [limits, setLimits] = useState<BroadcastLimits | null>(null);

  const checkAuth = useCallback(
    (res: Response): boolean => {
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/marketing/avatar-videos");
        return false;
      }
      return true;
    },
    [router],
  );

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch("/api/admin/marketing/avatar-videos/config", {
        credentials: "include",
      });
      if (!checkAuth(res)) return;
      if (!res.ok) {
        toast.error("No se pudo cargar la configuración");
        return;
      }
      const json = (await res.json()) as { config: AvatarConfig };
      setConfig(json.config);
    } finally {
      setLoadingConfig(false);
    }
  }, [checkAuth]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/marketing/avatar-videos/history", {
        credentials: "include",
      });
      if (!checkAuth(res)) return;
      if (!res.ok) return;
      const json = (await res.json()) as HistoryResponse;
      setHistory(json.entries);
      setCounts(json.counts);
      setCountsByPhase(json.countsByPhase ?? {});
      setOptedOutCount(json.optedOutCount ?? 0);
      setLastDayCount(json.lastDayCount ?? 0);
    } finally {
      setLoadingHistory(false);
    }
  }, [checkAuth]);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/admin/marketing/avatar-videos/broadcast", {
        credentials: "include",
      });
      if (!checkAuth(res)) return;
      if (!res.ok) return;
      const json = (await res.json()) as { campaigns: BroadcastCampaign[] };
      setCampaigns(json.campaigns);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [checkAuth]);

  const loadLimits = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/admin/marketing/avatar-videos/broadcast/limits",
        { credentials: "include" },
      );
      if (!checkAuth(res)) return;
      if (!res.ok) return;
      const json = (await res.json()) as { limits: BroadcastLimits };
      setLimits(json.limits);
    } catch {
      // silent
    }
  }, [checkAuth]);

  // Recipient count for the currently selected segment, used for cost preview
  useEffect(() => {
    if (bcSegment === "single") {
      setBcSegmentCount(bcUserEmail.trim() ? 1 : 0);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/admin/marketing/segments?segment=${encodeURIComponent(bcSegment)}&channel=all`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as { count: number };
      })
      .then((d) => {
        if (cancelled) return;
        setBcSegmentCount(d?.count ?? null);
      })
      .catch(() => {
        if (!cancelled) setBcSegmentCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bcSegment, bcUserEmail]);

  useEffect(() => {
    loadConfig();
    loadHistory();
    loadCampaigns();
    loadLimits();
  }, [loadConfig, loadHistory, loadCampaigns, loadLimits]);

  async function sendBroadcast() {
    if (!bcConfirm) {
      setBcConfirm(true);
      return;
    }
    setBcSending(true);
    setBcConfirm(false);
    try {
      const res = await fetch("/api/admin/marketing/avatar-videos/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bcTitle,
          segment: bcSegment,
          userEmail: bcSegment === "single" ? bcUserEmail : undefined,
          mode: bcMode,
          literalScript: bcMode === "literal" ? bcLiteralScript : undefined,
          briefing: bcMode === "briefing" ? bcBriefing : undefined,
          isShared: bcIsShared,
        }),
      });
      if (!checkAuth(res)) return;
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        recipientCount?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok || !j.ok) {
        toast.error(j.message ?? j.error ?? "Error al crear broadcast");
        return;
      }
      toast.success(
        `Broadcast enviado a ${j.recipientCount ?? 0} destinatario(s). Generando videos...`,
      );
      setBcTitle("");
      setBcLiteralScript("");
      setBcBriefing("");
      setBcUserEmail("");
      await Promise.all([loadCampaigns(), loadLimits()]);
    } finally {
      setBcSending(false);
    }
  }

  async function markAsWelcome(campaignId: string | null) {
    try {
      const res = await fetch(
        "/api/admin/marketing/avatar-videos/broadcast/mark-welcome",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
        },
      );
      if (!checkAuth(res)) return;
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        toast.error(j.error ?? "Error al marcar como bienvenida");
        return;
      }
      toast.success(
        campaignId ? "Marcada como video de bienvenida" : "Bienvenida desactivada",
      );
      await loadConfig();
    } catch {
      toast.error("Error de red");
    }
  }

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/avatar-videos/config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          maxVideosPerDay: config.maxVideosPerDay,
          midpointMinDays: config.midpointMinDays,
          maxBroadcastsPerMonth: config.maxBroadcastsPerMonth,
          broadcastUserCooldownDays: config.broadcastUserCooldownDays,
          tone: config.tone,
          avatarId: config.avatarId,
          promptTemplateStart: config.promptTemplateStart,
          promptTemplateMidpoint: config.promptTemplateMidpoint,
          promptTemplateEnd: config.promptTemplateEnd,
        }),
      });
      if (!checkAuth(res)) return;
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error((j as { error?: string }).error ?? "Error al guardar");
        return;
      }
      toast.success("Configuración guardada");
      await loadConfig();
    } finally {
      setSaving(false);
    }
  }

  async function trigger(action: "midpoint-scan" | "poll") {
    setTriggering(action);
    try {
      const res = await fetch("/api/admin/marketing/avatar-videos/trigger", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!checkAuth(res)) return;
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        stats?: Record<string, unknown>;
        error?: string;
        message?: string;
      };
      if (!res.ok || !j.ok) {
        toast.error(j.message ?? j.error ?? "Error al ejecutar");
        return;
      }
      toast.success(
        `${action === "midpoint-scan" ? "Scan midpoint" : "Polling"} ok: ${JSON.stringify(j.stats)}`,
      );
      await loadHistory();
    } finally {
      setTriggering(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Videos del mentor (arco del objetivo)"
      subtitle="Tres videos por objetivo: inicio (umbral), medio (prueba — disparado por estado emocional bajo), final (retorno, al completar). El usuario los ve una sola vez al abrir la app."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {config && !config.enabled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-200">Sistema desactivado</p>
              <p className="text-xs text-amber-300/80">
                Ningún video se generará mientras esté desactivado. Los hooks en /api/goals y el cron midpoint no hacen nada hasta que actives el toggle.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Hoy</p>
          <p className="mt-1 text-2xl font-bold text-white">{lastDayCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Inicios</p>
          <p className="mt-1 text-2xl font-bold text-white">{countsByPhase.START ?? 0}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">Medios</p>
          <p className="mt-1 text-2xl font-bold text-white">{countsByPhase.MIDPOINT ?? 0}</p>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400">Finales</p>
          <p className="mt-1 text-2xl font-bold text-white">{countsByPhase.END ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Opt-outs</p>
          <p className="mt-1 text-2xl font-bold text-white">{optedOutCount}</p>
        </div>
      </div>

      {/* Config panel */}
      <AdminPanel
        title="Configuración"
        tooltip="Controla el comportamiento del sistema. El kill switch detiene toda generación. El cap diario te protege de facturas sorpresa."
      >
        {loadingConfig || !config ? (
          <p className="text-sm text-zinc-500">Cargando...</p>
        ) : (
          <div className="space-y-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500"
              />
              <span className="text-sm text-white">
                Sistema activo <span className="text-zinc-500">(kill switch global)</span>
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Videos máximos por día
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={config.maxVideosPerDay}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxVideosPerDay: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
                <p className="text-[11px] text-zinc-500">Tope duro en 24h.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Días mínimos antes del medio
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={config.midpointMinDays}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      midpointMinDays: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
                <p className="text-[11px] text-zinc-500">
                  No dispara midpoint hasta que el goal tiene N días.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Tono
                </label>
                <select
                  value={config.tone}
                  onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="interpellation">Interpelativo (recomendado)</option>
                  <option value="motivation">Motivacional</option>
                  <option value="mixed">Mixto</option>
                </select>
              </div>
            </div>

            {/* Broadcast guardrails */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                Disciplina del canal broadcast
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Broadcasts máximos por mes
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={config.maxBroadcastsPerMonth}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        maxBroadcastsPerMonth: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Cap duro en ventana rolling de 30 días. Default: 4 (≈1 por semana).
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Cooldown por usuario (días)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={config.broadcastUserCooldownDays}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        broadcastUserCooldownDays: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Un usuario que recibió un broadcast en los últimos N días queda excluido del siguiente.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Avatar ID (HeyGen)
              </label>
              <input
                type="text"
                value={config.avatarId}
                onChange={(e) => setConfig({ ...config, avatarId: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* Three phase prompts */}
            {(
              [
                {
                  key: "promptTemplateStart" as const,
                  label: "Plantilla — Inicio (umbral)",
                  hint: "Variables: {userName}, {goalTitle}, {recentContext}",
                },
                {
                  key: "promptTemplateMidpoint" as const,
                  label: "Plantilla — Medio (prueba)",
                  hint: "Variables: {userName}, {goalTitle}, {currentState}, {recentContext}",
                },
                {
                  key: "promptTemplateEnd" as const,
                  label: "Plantilla — Final (retorno)",
                  hint: "Variables: {userName}, {goalTitle}, {recentContext}",
                },
              ]
            ).map((p) => (
              <div key={p.key} className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {p.label}
                </label>
                <textarea
                  value={config[p.key]}
                  onChange={(e) => setConfig({ ...config, [p.key]: e.target.value })}
                  rows={10}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-white focus:border-violet-500 focus:outline-none"
                />
                <p className="text-[11px] text-zinc-500">{p.hint}</p>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar
              </button>
              {config.updatedBy && (
                <span className="text-xs text-zinc-500">
                  Última edición por {config.updatedBy} el {formatDate(config.updatedAt)}
                </span>
              )}
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Manual triggers */}
      <AdminPanel
        title="Acciones manuales"
        tooltip="Ejecuta los crons a mano. El scan midpoint cuesta dinero (genera videos en HeyGen). El polling sólo descarga los ya listos."
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => trigger("midpoint-scan")}
            disabled={triggering !== null || !config?.enabled}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {triggering === "midpoint-scan" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Compass className="h-3.5 w-3.5" />
            )}
            Ejecutar scan midpoint
          </button>
          <button
            type="button"
            onClick={() => trigger("poll")}
            disabled={triggering !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition-colors disabled:opacity-50"
          >
            {triggering === "poll" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
            Polling de estados
          </button>
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Nota: los videos de <strong>Inicio</strong> y <strong>Final</strong> se disparan automáticamente al crear o completar un goal. No hace falta trigger manual para ellos.
        </p>
      </AdminPanel>

      {/* Broadcast create */}
      <AdminPanel
        title="Enviar video broadcast"
        tooltip="Envía un video del mentor a un usuario concreto o a un segmento. Cuidado: cuesta dinero por video generado. Usa 'video compartido' cuando todos reciban el mismo mensaje para pagar solo 1 generación."
      >
        <div className="space-y-4">
          {/* ── Guardrails: contador del mes y cooldown ─────────────────── */}
          {limits && (() => {
            const remaining = limits.monthlyRemaining;
            const atCap = remaining <= 0;
            const nearCap = remaining <= 1 && !atCap;
            const colour = atCap
              ? "border-red-500/40 bg-red-500/10"
              : nearCap
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-zinc-800 bg-zinc-900/40";
            const lastTxt = limits.lastBroadcastAt
              ? (() => {
                  const days = Math.floor(
                    (Date.now() - new Date(limits.lastBroadcastAt!).getTime()) /
                      (24 * 60 * 60 * 1000),
                  );
                  return days === 0 ? "hoy" : `hace ${days} día${days === 1 ? "" : "s"}`;
                })()
              : "nunca";
            return (
              <div className={`rounded-xl border p-3 ${colour}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Disciplina del canal (rolling 30 días)
                    </p>
                    <p className="text-sm text-white">
                      <strong>{limits.monthlyCount}</strong> / {limits.monthlyCap} broadcasts enviados ·{" "}
                      <span className="text-zinc-400">último envío {lastTxt}</span> ·{" "}
                      <span className="text-zinc-400">cooldown por usuario {limits.cooldownDays}d</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${atCap ? "text-red-300" : nearCap ? "text-amber-300" : "text-emerald-300"}`}>
                      {atCap ? "CAP ALCANZADO" : `${remaining} restantes`}
                    </p>
                  </div>
                </div>
                {atCap && (
                  <p className="mt-2 text-[11px] text-red-300">
                    No puedes enviar más broadcasts hasta que el conteo baje (los broadcasts antiguos &gt; 30 días dejan de contar). Sube el cap en config sólo si es realmente necesario.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Título interno
            </label>
            <input
              type="text"
              value={bcTitle}
              onChange={(e) => setBcTitle(e.target.value)}
              placeholder="Ej: Recordatorio evento sábado"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Segment */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Destinatario(s)
              </label>
              <select
                value={bcSegment}
                onChange={(e) => {
                  setBcSegment(e.target.value);
                  setBcConfirm(false);
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                {BROADCAST_SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {bcSegment === "single" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Email del usuario
                </label>
                <input
                  type="email"
                  value={bcUserEmail}
                  onChange={(e) => setBcUserEmail(e.target.value)}
                  placeholder="usuario@dominio.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Modo de contenido
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setBcMode("literal");
                  setBcConfirm(false);
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  bcMode === "literal"
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                    : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                Texto literal
              </button>
              <button
                type="button"
                onClick={() => {
                  setBcMode("briefing");
                  setBcConfirm(false);
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  bcMode === "briefing"
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                    : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                Briefing (IA genera)
              </button>
            </div>
          </div>

          {/* Content */}
          {bcMode === "literal" ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Texto literal del avatar
              </label>
              <textarea
                value={bcLiteralScript}
                onChange={(e) => setBcLiteralScript(e.target.value)}
                rows={5}
                placeholder="Lo que exactamente dirá el avatar. Máximo ~50 palabras (≈20 segundos)."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500">
                Palabras: {bcLiteralScript.trim().split(/\s+/).filter(Boolean).length}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Briefing para la IA
              </label>
              <textarea
                value={bcBriefing}
                onChange={(e) => setBcBriefing(e.target.value)}
                rows={5}
                placeholder={`Describe qué debe decir el avatar. Ej: "Agradécele su constancia esta semana y pregúntale si el objetivo sigue siendo suyo."`}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500">
                La IA transformará este briefing en un guión con la voz de Tres Mil Millones de Latidos.
              </p>
            </div>
          )}

          {/* Shared toggle */}
          <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <input
              type="checkbox"
              checked={bcIsShared}
              onChange={(e) => {
                setBcIsShared(e.target.checked);
                setBcConfirm(false);
              }}
              className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500"
            />
            <div className="space-y-1">
              <p className="text-sm text-white">Video compartido</p>
              <p className="text-[11px] text-zinc-500">
                Si está marcado: <strong>1 sola generación</strong> en HeyGen, reutilizada para todos los destinatarios. Barato.
                Si NO está marcado: <strong>un video distinto por usuario</strong> — el briefing se personaliza con su contexto. Caro, escala lineal.
              </p>
            </div>
          </label>

          {/* Cost estimate */}
          {bcSegmentCount !== null && bcSegmentCount > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Estimación
                  </p>
                  <p className="text-sm text-white">
                    <strong>{bcSegmentCount}</strong> destinatarios bruto ·{" "}
                    <span className="text-zinc-400">
                      {bcIsShared ? "1 video generado (compartido)" : `${bcSegmentCount} videos generados (per-user)`}
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Después se filtran opt-outs y usuarios en cooldown — el real será menor.
                  </p>
                </div>
                <p className="text-right text-base font-bold text-violet-300">
                  ≈ ${((bcIsShared ? 1 : bcSegmentCount) * HEYGEN_COST_PER_VIDEO).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Send button + confirm */}
          <div className="flex flex-wrap items-center gap-3">
            {bcConfirm && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <span className="text-xs text-white">
                  ¿Enviar broadcast a{" "}
                  <strong>
                    {bcSegment === "single" ? bcUserEmail || "?" : BROADCAST_SEGMENTS.find((s) => s.value === bcSegment)?.label}
                  </strong>
                  ?
                </span>
                <button
                  type="button"
                  onClick={() => setBcConfirm(false)}
                  className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={sendBroadcast}
              disabled={
                bcSending ||
                !bcTitle.trim() ||
                (bcMode === "literal" && !bcLiteralScript.trim()) ||
                (bcMode === "briefing" && !bcBriefing.trim()) ||
                (bcSegment === "single" && !bcUserEmail.trim()) ||
                !config?.enabled ||
                (limits !== null && limits.monthlyRemaining <= 0)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bcSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {bcSending ? "Enviando..." : bcConfirm ? "Confirmar envío" : "Enviar broadcast"}
            </button>
          </div>

          {!config?.enabled && (
            <p className="text-[11px] text-amber-400">
              El sistema global está desactivado. Actívalo arriba antes de enviar broadcasts.
            </p>
          )}
          {limits && limits.monthlyRemaining <= 0 && (
            <p className="text-[11px] text-red-400">
              Cap mensual alcanzado. Espera a que envíos antiguos caduquen o sube el cap en la sección de configuración.
            </p>
          )}
        </div>
      </AdminPanel>

      {/* Broadcast history */}
      <AdminPanel
        title="Broadcasts enviados"
        tooltip="Últimas 50 campañas. Incluye estado de generación y cuántos usuarios han visto el video."
      >
        {loadingCampaigns ? (
          <p className="text-sm text-zinc-500">Cargando...</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-6 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">No hay broadcasts todavía.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-125 overflow-y-auto">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        c.status === "READY"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : c.status === "GENERATING"
                            ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                            : c.status === "FAILED"
                              ? "bg-red-500/15 text-red-300 border-red-500/30"
                              : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="text-sm font-semibold text-white">{c.title}</span>
                    <span className="text-[10px] text-zinc-500">
                      <Users className="mr-0.5 inline h-3 w-3" />
                      {c.recipientCount} destinatarios
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                      {c.segment}
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                      {c.mode}
                    </span>
                    {c.isShared && (
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                        compartido
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600">{formatDate(c.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  <span className="text-emerald-400">READY {c.deliveryCounts.READY ?? 0}</span>
                  <span className="text-amber-400">PENDING {c.deliveryCounts.PENDING ?? 0}</span>
                  <span className="text-red-400">FAILED {c.deliveryCounts.FAILED ?? 0}</span>
                  <span className="text-violet-400">VISTO {c.deliveryCounts.SEEN ?? 0}</span>
                </div>
                {(c.literalScript || c.briefing) && (
                  <p className="text-xs text-zinc-400 italic">
                    {c.literalScript ? `"${c.literalScript}"` : `Briefing: ${c.briefing}`}
                  </p>
                )}
                {c.errorMessage && (
                  <p className="text-xs text-red-300">{c.errorMessage}</p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  {c.sharedVideoUrl && (
                    <a
                      href={c.sharedVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
                    >
                      <Video className="h-3 w-3" /> Ver video
                    </a>
                  )}
                  {/* Welcome template controls — only valid for shared READY campaigns */}
                  {c.isShared && c.status === "READY" && c.sharedVideoUrl && (
                    config?.welcomeCampaignId === c.id ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
                        <Sparkles className="h-3 w-3" />
                        VIDEO DE BIENVENIDA ACTIVO
                        <button
                          type="button"
                          onClick={() => markAsWelcome(null)}
                          className="ml-1 text-violet-300 hover:text-white"
                        >
                          (desactivar)
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markAsWelcome(c.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/40 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 hover:border-violet-500/40 hover:text-violet-300 transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        Marcar como bienvenida
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      {/* History */}
      <AdminPanel
        title="Historial"
        tooltip={`Últimos 100 videos · READY=${counts.READY ?? 0} · PENDING=${counts.PENDING ?? 0} · FAILED=${counts.FAILED ?? 0}`}
      >
        {loadingHistory ? (
          <p className="text-sm text-zinc-500">Cargando...</p>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-6 text-center">
            <Video className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">Aún no hay videos generados.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-150 overflow-y-auto">
            {history.map((entry) => {
              const badge = phaseBadge(entry.phase);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.classes}`}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          entry.status === "READY"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : entry.status === "PENDING"
                              ? "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30"
                              : "bg-red-500/15 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {entry.status}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {entry.user.name || entry.user.email}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {entry.trigger}
                      </span>
                      {entry.seenAt && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> visto
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    <Target className="inline h-3 w-3 mr-1" />
                    {entry.goal.title}
                  </p>
                  {entry.script && (
                    <p className="text-xs text-zinc-300 italic">&ldquo;{entry.script}&rdquo;</p>
                  )}
                  {entry.errorMessage && (
                    <p className="text-xs text-red-300">{entry.errorMessage}</p>
                  )}
                  {entry.videoUrl && (
                    <a
                      href={entry.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
                    >
                      <Video className="h-3 w-3" /> Ver video
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
