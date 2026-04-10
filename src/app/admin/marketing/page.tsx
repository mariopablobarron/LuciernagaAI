"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import {
  Send,
  Mail,
  BarChart3,
  MessageSquarePlus,
  Star,
  Users,
  Radio,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type MarketingMetrics = {
  signups7d: number;
  quiz7d: number;
  waitlist7d: number;
  proUsers: number;
  funnel: {
    quiz: number;
    waitlist: number;
    signup: number;
    pro: number;
  };
};

type HistoryEntry = {
  id: string;
  channel: "telegram" | "email";
  segment: string;
  recipientCount: number;
  successCount: number;
  failCount: number;
  createdAt: string;
};

type FeedbackItem = {
  id: string;
  type: string;
  rating: number | null;
  message: string;
  page: string | null;
  createdAt: string;
  user: { email: string; name: string | null };
};

type FeedbackSummary = {
  total: number;
  avgRating: number | null;
  ratingDistribution: { rating: number; count: number }[];
  byType: { type: string; count: number }[];
};

type Tab = "telegram" | "email" | "metrics" | "feedback";

const SEGMENTS = [
  { value: "all", label: "Todos" },
  { value: "active_7d", label: "Activos 7d" },
  { value: "inactive_7d", label: "Inactivos 7d+" },
  { value: "pro", label: "Pro" },
  { value: "free", label: "Free" },
  { value: "crisis", label: "Crisis" },
  { value: "state:bloqueo", label: "Estado: bloqueo" },
  { value: "state:ansiedad", label: "Estado: ansiedad" },
  { value: "state:duda", label: "Estado: duda" },
  { value: "state:claridad", label: "Estado: claridad" },
  { value: "state:neutral", label: "Estado: neutral" },
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

function conversionRate(from: number, to: number): string {
  if (from === 0) return "0%";
  return `${((to / from) * 100).toFixed(1)}%`;
}

// ── Segment selector (reused in Telegram + Email tabs) ───────────────────────

function SegmentSelector({
  segment,
  onChange,
  recipientCount,
  channelLabel,
}: {
  segment: string;
  onChange: (v: string) => void;
  recipientCount: number | null;
  channelLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Segmento
      </label>
      <select
        value={segment}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      >
        {SEGMENTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {recipientCount !== null && (
        <p className="text-xs text-zinc-400">
          <Users className="mr-1 inline h-3 w-3" />
          <span className="font-semibold text-white">{recipientCount}</span> destinatarios con{" "}
          {channelLabel}
        </p>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MarketingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("telegram");

  // Telegram state
  const [tgMessage, setTgMessage] = useState("");
  const [tgSegment, setTgSegment] = useState("all");
  const [tgRecipients, setTgRecipients] = useState<number | null>(null);
  const [tgSending, setTgSending] = useState(false);
  const [tgResult, setTgResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [tgConfirm, setTgConfirm] = useState(false);

  // Email state
  const [emSubject, setEmSubject] = useState("");
  const [emBody, setEmBody] = useState("");
  const [emSegment, setEmSegment] = useState("all");
  const [emRecipients, setEmRecipients] = useState<number | null>(null);
  const [emSending, setEmSending] = useState(false);
  const [emResult, setEmResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [emConfirm, setEmConfirm] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // ── Auth guard helper ──────────────────────────────────────────────────────

  function checkAuth(res: Response): boolean {
    if (res.status === 401) {
      router.replace("/admin/login?next=/admin/marketing");
      return false;
    }
    return true;
  }

  // ── Segment count fetcher ──────────────────────────────────────────────────

  const fetchSegmentCount = useCallback(
    async (segment: string, channel: "telegram" | "email") => {
      try {
        const res = await fetch(
          `/api/admin/marketing/segments?segment=${encodeURIComponent(segment)}&channel=${channel}`
        );
        if (!checkAuth(res)) return;
        const json = (await res.json()) as { count: number };
        if (channel === "telegram") setTgRecipients(json.count);
        else setEmRecipients(json.count);
      } catch {
        // silent
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  // Fetch segment count when segment changes
  useEffect(() => {
    fetchSegmentCount(tgSegment, "telegram");
  }, [tgSegment, fetchSegmentCount]);

  useEffect(() => {
    fetchSegmentCount(emSegment, "email");
  }, [emSegment, fetchSegmentCount]);

  // ── Metrics + history loader ───────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "metrics") return;
    setMetricsLoading(true);

    Promise.all([
      fetch("/api/admin/marketing/metrics").then(async (res) => {
        if (!checkAuth(res)) return null;
        return (await res.json()) as MarketingMetrics;
      }),
      fetch("/api/admin/marketing/history").then(async (res) => {
        if (!checkAuth(res)) return [];
        return ((await res.json()) as { entries: HistoryEntry[] }).entries ?? [];
      }),
    ])
      .then(([m, h]) => {
        if (m) setMetrics(m);
        if (h) setHistory(h);
      })
      .catch(() => { toast.error("Error al cargar métricas de marketing"); })
      .finally(() => setMetricsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Feedback loader ────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "feedback") return;
    setFeedbackLoading(true);
    fetch("/api/admin/feedback")
      .then((r) => { if (!checkAuth(r)) return null; return r.json(); })
      .then((d: { feedbacks?: FeedbackItem[]; summary?: FeedbackSummary } | null) => {
        if (d?.feedbacks) setFeedbacks(d.feedbacks);
        if (d?.summary) setFeedbackSummary(d.summary);
      })
      .catch(() => { toast.error("Error al cargar feedback"); })
      .finally(() => setFeedbackLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Send handlers ──────────────────────────────────────────────────────────

  async function handleSendTelegram() {
    if (!tgConfirm) {
      setTgConfirm(true);
      return;
    }
    setTgSending(true);
    setTgResult(null);
    setTgConfirm(false);
    try {
      const res = await fetch("/api/admin/marketing/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: tgMessage, segment: tgSegment }),
      });
      if (!checkAuth(res)) return;
      const json = (await res.json()) as {
        successCount?: number;
        failureCount?: number;
        success?: number;
        failed?: number;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setTgResult({ ok: false, message: json.message ?? json.error ?? `Error ${res.status}` });
      } else {
        const ok = json.successCount ?? json.success ?? 0;
        const fail = json.failureCount ?? json.failed ?? 0;
        setTgResult({
          ok: fail === 0,
          message: `Enviado: ${ok} ok, ${fail} fallidos`,
        });
      }
    } catch {
      setTgResult({ ok: false, message: "Error de red al enviar broadcast" });
    } finally {
      setTgSending(false);
    }
  }

  async function handleSendEmail() {
    if (!emConfirm) {
      setEmConfirm(true);
      return;
    }
    setEmSending(true);
    setEmResult(null);
    setEmConfirm(false);
    try {
      const res = await fetch("/api/admin/marketing/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emSubject, body: emBody, segment: emSegment }),
      });
      if (!checkAuth(res)) return;
      const json = (await res.json()) as {
        success: number;
        failed: number;
        message?: string;
      };
      setEmResult({
        ok: json.failed === 0,
        message: json.message ?? `Enviado: ${json.success} ok, ${json.failed} fallidos`,
      });
    } catch {
      setEmResult({ ok: false, message: "Error de red al enviar campaña" });
    } finally {
      setEmSending(false);
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  // ── Tabs config ────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "telegram", label: "Telegram", icon: <Radio className="h-3.5 w-3.5" /> },
    { key: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
    { key: "metrics", label: "Metricas", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: "feedback", label: "Feedback", icon: <MessageSquarePlus className="h-3.5 w-3.5" /> },
  ];

  return (
    <AdminShell
      title="Marketing"
      subtitle="Broadcast, campanas de email y metricas de conversion. Gestiona la comunicacion con tus usuarios desde un unico panel."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Telegram ───────────────────────────────────────────────────── */}
      {activeTab === "telegram" && (
        <AdminPanel
          title="Broadcast Telegram"
          tooltip="Envia un mensaje a todos los usuarios del segmento seleccionado que tienen Telegram vinculado. Maximo 4096 caracteres por mensaje."
        >
          <div className="space-y-4">
            {/* Message */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Mensaje
              </label>
              <textarea
                value={tgMessage}
                onChange={(e) => setTgMessage(e.target.value.slice(0, 4096))}
                maxLength={4096}
                rows={6}
                placeholder="Escribe el mensaje para enviar por Telegram..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-right text-xs text-zinc-500">
                {tgMessage.length} / 4096
              </p>
            </div>

            {/* Segment */}
            <SegmentSelector
              segment={tgSegment}
              onChange={(v) => {
                setTgSegment(v);
                setTgConfirm(false);
              }}
              recipientCount={tgRecipients}
              channelLabel="Telegram"
            />

            {/* Confirm + Send */}
            <div className="flex flex-wrap items-center gap-3">
              {tgConfirm && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <span className="text-xs text-white">
                    Enviar a <span className="font-semibold">{tgRecipients ?? "?"}</span>{" "}
                    destinatarios?
                  </span>
                  <button
                    type="button"
                    onClick={() => setTgConfirm(false)}
                    className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleSendTelegram}
                disabled={tgSending || tgMessage.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
                {tgSending ? "Enviando..." : tgConfirm ? "Confirmar envio" : "Enviar"}
              </button>
            </div>

            {/* Result */}
            {tgResult && (
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                  tgResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {tgResult.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {tgResult.message}
              </div>
            )}
          </div>
        </AdminPanel>
      )}

      {/* ── Tab: Email ──────────────────────────────────────────────────────── */}
      {activeTab === "email" && (
        <AdminPanel
          title="Campana de email"
          tooltip="Envia una campana de email a todos los usuarios del segmento seleccionado que tienen email registrado. El cuerpo acepta HTML."
        >
          <div className="space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Asunto
              </label>
              <input
                type="text"
                value={emSubject}
                onChange={(e) => setEmSubject(e.target.value)}
                placeholder="Asunto del email..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Cuerpo (HTML)
              </label>
              <textarea
                value={emBody}
                onChange={(e) => setEmBody(e.target.value)}
                rows={10}
                placeholder="<h1>Tu mensaje aqui</h1><p>Contenido del email...</p>"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Segment */}
            <SegmentSelector
              segment={emSegment}
              onChange={(v) => {
                setEmSegment(v);
                setEmConfirm(false);
              }}
              recipientCount={emRecipients}
              channelLabel="email"
            />

            {/* Confirm + Send */}
            <div className="flex flex-wrap items-center gap-3">
              {emConfirm && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <span className="text-xs text-white">
                    Enviar campana a{" "}
                    <span className="font-semibold">{emRecipients ?? "?"}</span> destinatarios?
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmConfirm(false)}
                    className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={emSending || emSubject.trim().length === 0 || emBody.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-3.5 w-3.5" />
                {emSending
                  ? "Enviando..."
                  : emConfirm
                    ? "Confirmar envio"
                    : "Enviar campana"}
              </button>
            </div>

            {/* Result */}
            {emResult && (
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                  emResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {emResult.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {emResult.message}
              </div>
            )}
          </div>
        </AdminPanel>
      )}

      {/* ── Tab: Metrics ────────────────────────────────────────────────────── */}
      {activeTab === "metrics" && (
        <>
          {metricsLoading && !metrics ? (
            <div className="card-surface rounded-xl border border-zinc-800 p-6">
              <p className="text-sm text-zinc-500">Cargando metricas...</p>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminMetricCard
                  label="Signups 7d"
                  value={metrics?.signups7d ?? 0}
                  accent="emerald"
                  hint="Nuevos registros en los ultimos 7 dias"
                  icon={<Users className="h-5 w-5" />}
                />
                <AdminMetricCard
                  label="Quiz 7d"
                  value={metrics?.quiz7d ?? 0}
                  accent="sky"
                  hint="Usuarios que completaron el quiz en 7 dias"
                  icon={<BarChart3 className="h-5 w-5" />}
                />
                <AdminMetricCard
                  label="Waitlist 7d"
                  value={metrics?.waitlist7d ?? 0}
                  accent="amber"
                  hint="Usuarios en waitlist en los ultimos 7 dias"
                />
                <AdminMetricCard
                  label="Pro users"
                  value={metrics?.proUsers ?? 0}
                  accent="violet"
                  hint="Total de usuarios con plan Pro activo"
                />
              </div>

              {/* Conversion funnel */}
              <AdminPanel
                title="Embudo de conversion"
                tooltip="Muestra el flujo completo desde Quiz hasta Pro, con tasas de conversion entre cada paso. Los porcentajes indican cuantos usuarios del paso anterior avanzan al siguiente."
              >
                <div className="space-y-3">
                  {(() => {
                    const funnel = metrics?.funnel ?? {
                      quiz: 0,
                      waitlist: 0,
                      signup: 0,
                      pro: 0,
                    };
                    const steps: { label: string; count: number; key: string }[] = [
                      { label: "Quiz", count: funnel.quiz, key: "quiz" },
                      { label: "Waitlist", count: funnel.waitlist, key: "waitlist" },
                      { label: "Signup", count: funnel.signup, key: "signup" },
                      { label: "Pro", count: funnel.pro, key: "pro" },
                    ];

                    return steps.map((step, idx) => (
                      <div key={step.key}>
                        <div className="flex items-center gap-3">
                          {/* Bar */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-white">{step.label}</span>
                              <span className="text-sm font-bold text-white">{step.count}</span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-violet-500/60 transition-all"
                                style={{
                                  width:
                                    steps[0].count > 0
                                      ? `${Math.max((step.count / steps[0].count) * 100, 2)}%`
                                      : "0%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        {/* Conversion rate arrow */}
                        {idx < steps.length - 1 && (
                          <div className="flex items-center gap-2 pl-2 py-1">
                            <ArrowRight className="h-3 w-3 text-zinc-600" />
                            <span className="text-xs text-zinc-500">
                              {conversionRate(step.count, steps[idx + 1].count)} conversion
                            </span>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </AdminPanel>

              {/* Send history */}
              <AdminPanel
                title="Historial de envios"
                tooltip="Registro de todos los broadcasts y campanas enviados. Incluye canal, segmento, destinatarios y resultado (exito/fallo)."
              >
                {history.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-6 text-center">
                    <Send className="mx-auto h-8 w-8 text-zinc-600" />
                    <p className="mt-3 text-sm text-zinc-500">
                      No hay envios registrados todavia.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Channel badge */}
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              entry.channel === "telegram"
                                ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {entry.channel === "telegram" ? (
                              <Radio className="mr-1 inline h-3 w-3" />
                            ) : (
                              <Mail className="mr-1 inline h-3 w-3" />
                            )}
                            {entry.channel}
                          </span>
                          {/* Segment badge */}
                          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                            {entry.segment}
                          </span>
                          {/* Recipients */}
                          <span className="text-zinc-500">
                            <Users className="mr-1 inline h-3 w-3" />
                            {entry.recipientCount} destinatarios
                          </span>
                          {/* Success/fail */}
                          <span className="text-emerald-400">
                            <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
                            {entry.successCount}
                          </span>
                          {entry.failCount > 0 && (
                            <span className="text-red-400">
                              <XCircle className="mr-0.5 inline h-3 w-3" />
                              {entry.failCount}
                            </span>
                          )}
                          {/* Date */}
                          <span className="ml-auto text-zinc-500">
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminPanel>
            </>
          )}
        </>
      )}
      {/* ── Tab: Feedback ───────────────────────────────────────────────────── */}
      {activeTab === "feedback" && (
        <>
          {feedbackLoading && !feedbackSummary ? (
            <div className="card-surface rounded-xl border border-zinc-800 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-48 rounded bg-zinc-800" />
                <div className="h-20 rounded bg-zinc-800/60" />
              </div>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <AdminMetricCard
                  label="Total feedback"
                  value={feedbackSummary?.total ?? 0}
                  accent="violet"
                  icon={<MessageSquarePlus className="h-5 w-5" />}
                />
                <AdminMetricCard
                  label="Valoracion media"
                  value={feedbackSummary?.avgRating ? `${feedbackSummary.avgRating.toFixed(1)}/5` : "—"}
                  accent="rose"
                  icon={<Star className="h-5 w-5" />}
                />
                <AdminMetricCard
                  label="Sugerencias"
                  value={feedbackSummary?.byType.find((t) => t.type === "suggestion")?.count ?? 0}
                  accent="sky"
                  hint="Tipo: sugerencia"
                  icon={<MessageSquarePlus className="h-5 w-5" />}
                />
                <AdminMetricCard
                  label="Bugs reportados"
                  value={feedbackSummary?.byType.find((t) => t.type === "bug")?.count ?? 0}
                  accent="amber"
                  hint="Tipo: problema"
                  icon={<XCircle className="h-5 w-5" />}
                />
              </div>

              {/* Rating distribution */}
              {feedbackSummary && feedbackSummary.ratingDistribution.some((r) => r.count > 0) && (
                <AdminPanel title="Distribucion de valoraciones">
                  <div className="flex items-end gap-3 h-32">
                    {feedbackSummary.ratingDistribution.map((r) => {
                      const maxCount = Math.max(...feedbackSummary.ratingDistribution.map((d) => d.count), 1);
                      const pct = (r.count / maxCount) * 100;
                      return (
                        <div key={r.rating} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-zinc-500">{r.count}</span>
                          <div
                            className="w-full rounded-t-lg bg-fuchsia-500/30 border border-fuchsia-500/20 transition-all"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-fuchsia-400 fill-fuchsia-400" />
                            <span className="text-xs text-zinc-400">{r.rating}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AdminPanel>
              )}

              {/* Feedback list */}
              <AdminPanel
                title="Feedback reciente"
                tooltip="Ultimos 100 feedbacks ordenados por fecha. Incluye valoracion, tipo, mensaje y pagina."
              >
                {feedbacks.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-6 text-center">
                    <MessageSquarePlus className="mx-auto h-8 w-8 text-zinc-600" />
                    <p className="mt-3 text-sm text-zinc-500">
                      Aun no hay feedback de usuarios.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {fb.rating && (
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={`w-3 h-3 ${
                                      n <= fb.rating!
                                        ? "text-fuchsia-400 fill-fuchsia-400"
                                        : "text-zinc-700"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              fb.type === "bug"
                                ? "bg-red-500/15 text-red-400"
                                : fb.type === "nps"
                                  ? "bg-fuchsia-500/15 text-fuchsia-400"
                                  : "bg-violet-500/15 text-violet-400"
                            }`}>
                              {fb.type}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-600">{formatDate(fb.createdAt)}</span>
                        </div>
                        <p className="text-sm text-zinc-300">{fb.message}</p>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                          <span>{fb.user.name || fb.user.email}</span>
                          {fb.page && <span className="text-zinc-700">{fb.page}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminPanel>
            </>
          )}
        </>
      )}
    </AdminShell>
  );
}
