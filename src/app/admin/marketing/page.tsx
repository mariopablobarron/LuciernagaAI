"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import Link from "next/link";
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
  Video,
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

type Tab = "telegram" | "email" | "metrics" | "feedback" | "atribucion" | "tagging" | "testimonials" | "referidos";

type AttributionRow = {
  source: string;
  medium: string | null;
  campaign: string | null;
  signups: number;
  proUsers: number;
  proRate: number;
};

type AttributionReport = {
  range: "7d" | "30d" | "90d" | "all";
  rangeStart: string | null;
  totalSignups: number;
  totalPro: number;
  overallProRate: number;
  rows: AttributionRow[];
};

type TestimonialCandidate = {
  id: string;
  type: string;
  rating: number | null;
  message: string;
  createdAt: string;
  isPublicTestimonial: boolean;
  testimonialOrder: number | null;
  user: { name: string | null; email: string };
};

type ReferralRow = {
  userId: string;
  name: string | null;
  email: string;
  invitesCreated: number;
  invitesUsed: number;
  invitesEarned: number;
  conversionRate: number;
};

type ReferralReason = {
  reason: string;
  generated: number;
  used: number;
  conversionRate: number; // 0..1
};

type ReferralRetentionWindow = {
  referred: number;       // % retained (0..100)
  nonReferred: number;
  referredCohort: number;
  nonReferredCohort: number;
};

type ReferralTimelinePoint = {
  date: string;
  generated: number;
  used: number;
};

type ReferralSummary = {
  totalInvitationsCreated: number;
  totalInvitationsUsed: number;
  uniqueInviters: number;
  overallConversionRate: number;
  topInviters: ReferralRow[];
  pending: number;
  generated7d: number;
  used7d: number;
  generated30d: number;
  used30d: number;
  byReason: ReferralReason[];
  retention: {
    d7: ReferralRetentionWindow;
    d30: ReferralRetentionWindow;
  };
  dailyTimeline: ReferralTimelinePoint[];
};

const REFERRAL_REASON_LABEL: Record<string, string> = {
  streak_7d: "Racha 7 días",
  streak_30d: "Racha 30 días",
  goal_complete: "Primer objetivo",
  active_30d: "30 días activo",
  manual: "Manual",
  unknown: "Sin clasificar",
};

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

  // Attribution state
  const [attribution, setAttribution] = useState<AttributionReport | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(false);
  const [attributionRange, setAttributionRange] =
    useState<AttributionReport["range"]>("30d");

  // Tagging state
  const [tagEmail, setTagEmail] = useState("");
  const [tagCurrentTags, setTagCurrentTags] = useState<string[] | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagLoading, setTagLoading] = useState(false);
  const [tagUserId, setTagUserId] = useState<string | null>(null);

  // Testimonials state
  const [testimonials, setTestimonials] = useState<TestimonialCandidate[]>([]);
  const [testimonialsPublishedCount, setTestimonialsPublishedCount] = useState(0);
  const [testimonialsLoading, setTestimonialsLoading] = useState(false);

  // Referrals state
  const [referrals, setReferrals] = useState<ReferralSummary | null>(null);
  const [referralsLoading, setReferralsLoading] = useState(false);

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
        if (!res.ok) return;
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
      fetch("/api/admin/marketing/metrics", { credentials: "include" }).then(async (res) => {
        if (!checkAuth(res)) return null;
        if (!res.ok) return null;
        return (await res.json()) as MarketingMetrics;
      }),
      fetch("/api/admin/marketing/history", { credentials: "include" }).then(async (res) => {
        if (!checkAuth(res)) return [];
        if (!res.ok) return [];
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

  // ── Attribution loader ────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "atribucion") return;
    setAttributionLoading(true);
    fetch(
      `/api/admin/marketing/attribution?range=${encodeURIComponent(attributionRange)}`,
      { credentials: "include" },
    )
      .then(async (res) => {
        if (!checkAuth(res)) return null;
        if (!res.ok) return null;
        const json = (await res.json()) as { report: AttributionReport };
        return json.report;
      })
      .then((report) => {
        if (report) setAttribution(report);
      })
      .catch(() => {
        toast.error("Error al cargar atribución");
      })
      .finally(() => setAttributionLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, attributionRange]);

  // ── Testimonials loader ───────────────────────────────────────────────────

  const loadTestimonials = useCallback(async () => {
    setTestimonialsLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/testimonials", {
        credentials: "include",
      });
      if (!checkAuth(res)) return;
      if (!res.ok) return;
      const json = (await res.json()) as {
        candidates: TestimonialCandidate[];
        publishedCount: number;
      };
      setTestimonials(json.candidates);
      setTestimonialsPublishedCount(json.publishedCount);
    } finally {
      setTestimonialsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "testimonials") return;
    loadTestimonials();
  }, [activeTab, loadTestimonials]);

  // ── Referrals loader ──────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "referidos") return;
    setReferralsLoading(true);
    fetch("/api/admin/marketing/referrals", { credentials: "include" })
      .then(async (res) => {
        if (!checkAuth(res)) return null;
        if (!res.ok) return null;
        const json = (await res.json()) as { summary: ReferralSummary };
        return json.summary;
      })
      .then((s) => {
        if (s) setReferrals(s);
      })
      .finally(() => setReferralsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Tagging handlers ──────────────────────────────────────────────────────

  async function loadTagsForEmail() {
    if (!tagEmail.trim()) return;
    setTagLoading(true);
    setTagCurrentTags(null);
    setTagUserId(null);
    try {
      // First resolve email → userId via segment lookup trick (a dedicated
      // endpoint would be cleaner; reusing the users search to avoid another file)
      const lookup = await fetch(
        `/api/admin/users?search=${encodeURIComponent(tagEmail.trim())}&limit=1`,
        { credentials: "include" },
      );
      if (!checkAuth(lookup)) return;
      if (!lookup.ok) {
        toast.error("Usuario no encontrado");
        return;
      }
      const data = (await lookup.json()) as {
        users?: Array<{ id: string; email: string; tags?: string[] }>;
      };
      const user = data.users?.find(
        (u) => u.email.toLowerCase() === tagEmail.trim().toLowerCase(),
      );
      if (!user) {
        toast.error("Email no encontrado exactamente");
        return;
      }
      setTagUserId(user.id);
      // Explicit tags fetch using the new endpoint
      const tagsRes = await fetch(
        `/api/admin/users/${encodeURIComponent(user.id)}/tags`,
        { credentials: "include" },
      );
      if (!checkAuth(tagsRes)) return;
      if (tagsRes.ok) {
        const tj = (await tagsRes.json()) as { tags: string[] };
        setTagCurrentTags(tj.tags);
      } else {
        setTagCurrentTags([]);
      }
    } finally {
      setTagLoading(false);
    }
  }

  async function saveTags(nextTags: string[]) {
    if (!tagUserId) return;
    setTagLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(tagUserId)}/tags`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: nextTags }),
        },
      );
      if (!checkAuth(res)) return;
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Error al guardar tags");
        return;
      }
      const j = (await res.json()) as { tags: string[] };
      setTagCurrentTags(j.tags);
      toast.success("Tags actualizados");
    } finally {
      setTagLoading(false);
    }
  }

  async function toggleTestimonial(
    id: string,
    isPublicTestimonial: boolean,
  ) {
    try {
      const res = await fetch("/api/admin/marketing/testimonials", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPublicTestimonial }),
      });
      if (!checkAuth(res)) return;
      if (!res.ok) {
        toast.error("Error");
        return;
      }
      await loadTestimonials();
    } catch {
      toast.error("Error de red");
    }
  }

  // ── Feedback loader ────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "feedback") return;
    setFeedbackLoading(true);
    fetch("/api/admin/feedback", { credentials: "include" })
      .then((r) => { if (!checkAuth(r)) return null; if (!r.ok) return null; return r.json(); })
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
      const res = await fetch("/api/admin/marketing/broadcast", { credentials: "include",         method: "POST",
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
      const res = await fetch("/api/admin/marketing/campaign", { credentials: "include",         method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emSubject, body: emBody, segment: emSegment }),
      });
      if (!checkAuth(res)) return;
      const json = (await res.json()) as {
        ok?: boolean;
        recipientCount?: number;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setEmResult({ ok: false, message: json.message ?? json.error ?? `Error ${res.status}` });
      } else {
        setEmResult({
          ok: true,
          message: json.message ?? `Enviando a ${json.recipientCount ?? 0} destinatarios...`,
        });
        setEmSubject("");
        setEmBody("");
      }
    } catch {
      setEmResult({ ok: false, message: "Error de red al enviar campaña" });
    } finally {
      setEmSending(false);
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  // ── Tabs config ────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "telegram", label: "Telegram", icon: <Radio className="h-3.5 w-3.5" /> },
    { key: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
    { key: "metrics", label: "Metricas", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: "feedback", label: "Feedback", icon: <MessageSquarePlus className="h-3.5 w-3.5" /> },
    { key: "atribucion", label: "Atribución", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: "tagging", label: "Tags", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "testimonials", label: "Testimonials", icon: <Star className="h-3.5 w-3.5" /> },
    { key: "referidos", label: "Referidos", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <AdminShell
      title="Marketing"
      subtitle="Broadcast, campanas de email y metricas de conversion. Gestiona la comunicacion con tus usuarios desde un unico panel."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Quick-nav: sub-páginas del panel de marketing */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/marketing/avatar-videos"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 transition-colors"
        >
          <Video className="h-3.5 w-3.5" />
          Video avatar semanal
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/admin/marketing/equipo"
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          Contenido del equipo
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

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

      {/* ── Tab: Atribución ─────────────────────────────────────────────────── */}
      {activeTab === "atribucion" && (
        <>
          {/* Range selector + overall stats */}
          <AdminPanel
            title="Atribución por fuente"
            tooltip="Agrupa los signups del rango seleccionado por utm_source (o el valor legacy de User.source si no hay UTMs). Muestra la tasa de conversión a Pro de cada fuente."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["7d", "30d", "90d", "all"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAttributionRange(r)}
                    className={`inline-flex items-center rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                      attributionRange === r
                        ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                        : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {r === "7d"
                      ? "Últimos 7 días"
                      : r === "30d"
                        ? "Últimos 30 días"
                        : r === "90d"
                          ? "Últimos 90 días"
                          : "Todo el tiempo"}
                  </button>
                ))}
              </div>

              {attributionLoading && !attribution ? (
                <p className="text-sm text-zinc-500">Cargando...</p>
              ) : !attribution ? (
                <p className="text-sm text-zinc-500">Sin datos.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <AdminMetricCard
                      label="Signups en rango"
                      value={attribution.totalSignups}
                      accent="emerald"
                      icon={<Users className="h-5 w-5" />}
                    />
                    <AdminMetricCard
                      label="Conversiones Pro"
                      value={attribution.totalPro}
                      accent="violet"
                      icon={<Star className="h-5 w-5" />}
                    />
                    <AdminMetricCard
                      label="Tasa Pro global"
                      value={`${(attribution.overallProRate * 100).toFixed(1)}%`}
                      accent="sky"
                      hint="Pro activos / signups del rango"
                    />
                  </div>
                </>
              )}
            </div>
          </AdminPanel>

          {/* Sources table */}
          {attribution && attribution.rows.length > 0 && (
            <AdminPanel
              title="Desglose por fuente"
              tooltip="Ordenado por volumen. 'Medium' y 'Campaign' muestran el valor más común dentro de cada fuente."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                      <th className="text-left py-2 px-3 font-semibold">Source</th>
                      <th className="text-left py-2 px-3 font-semibold">Medium</th>
                      <th className="text-left py-2 px-3 font-semibold">Campaign</th>
                      <th className="text-right py-2 px-3 font-semibold">Signups</th>
                      <th className="text-right py-2 px-3 font-semibold">Pro</th>
                      <th className="text-right py-2 px-3 font-semibold">Tasa Pro</th>
                      <th className="text-left py-2 px-3 font-semibold">% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attribution.rows.map((row) => {
                      const share =
                        attribution.totalSignups > 0
                          ? row.signups / attribution.totalSignups
                          : 0;
                      const proPct = row.proRate * 100;
                      const proColour =
                        proPct >= 10
                          ? "text-emerald-300"
                          : proPct >= 3
                            ? "text-amber-300"
                            : "text-zinc-400";
                      return (
                        <tr
                          key={row.source}
                          className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors"
                        >
                          <td className="py-2 px-3 text-white font-semibold">
                            {row.source}
                          </td>
                          <td className="py-2 px-3 text-zinc-400">
                            {row.medium ?? <span className="text-zinc-700">—</span>}
                          </td>
                          <td className="py-2 px-3 text-zinc-400">
                            {row.campaign ?? <span className="text-zinc-700">—</span>}
                          </td>
                          <td className="py-2 px-3 text-right text-white font-semibold">
                            {row.signups}
                          </td>
                          <td className="py-2 px-3 text-right text-white">
                            {row.proUsers}
                          </td>
                          <td className={`py-2 px-3 text-right font-semibold ${proColour}`}>
                            {proPct.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-zinc-800 overflow-hidden max-w-35">
                                <div
                                  className="h-full rounded-full bg-violet-500/60"
                                  style={{ width: `${Math.max(share * 100, 2)}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-zinc-500 w-10 text-right">
                                {(share * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-zinc-500">
                Las fuentes <code>(direct)</code> corresponden a signups sin UTMs.{" "}
                <code>(unknown)</code> indica UTM presente pero sin <code>utm_source</code>.{" "}
                <code>(malformed)</code> indica que el JSON de <code>User.source</code> no se pudo parsear (usuarios legacy).
              </p>
            </AdminPanel>
          )}
        </>
      )}

      {/* ── Tab: Tags ──────────────────────────────────────────────────────── */}
      {activeTab === "tagging" && (
        <AdminPanel
          title="Gestión de tags de usuarios"
          tooltip="Asigna etiquetas manuales a un usuario (beta, vip, churning, etc.). Luego usa 'tag:nombre' como segmento en broadcasts de Telegram/Email/Avatar. Solo letras, números, guión y guión bajo. Máximo 20 tags por usuario."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-60 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Email del usuario
                </label>
                <input
                  type="email"
                  value={tagEmail}
                  onChange={(e) => setTagEmail(e.target.value)}
                  placeholder="usuario@dominio.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={loadTagsForEmail}
                disabled={tagLoading || !tagEmail.trim()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {tagLoading ? "Cargando..." : "Buscar"}
              </button>
            </div>

            {tagCurrentTags !== null && tagUserId && (
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Tags actuales ({tagCurrentTags.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {tagCurrentTags.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Sin tags</p>
                  ) : (
                    tagCurrentTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() =>
                            saveTags(tagCurrentTags.filter((x) => x !== t))
                          }
                          className="text-violet-300 hover:text-white"
                          aria-label={`Eliminar tag ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        const newTag = tagInput.trim().toLowerCase();
                        if (!tagCurrentTags.includes(newTag)) {
                          saveTags([...tagCurrentTags, newTag]);
                        }
                        setTagInput("");
                      }
                    }}
                    placeholder="Nuevo tag (enter para añadir)"
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Una vez asignado un tag, úsalo como segmento escribiendo{" "}
                  <code className="text-zinc-400">tag:{"<nombre>"}</code> en cualquier broadcast.
                </p>
              </div>
            )}
          </div>
        </AdminPanel>
      )}

      {/* ── Tab: Testimonials ─────────────────────────────────────────────── */}
      {activeTab === "testimonials" && (
        <AdminPanel
          title="Testimonials públicos"
          tooltip="Selecciona qué feedbacks se muestran en la landing como testimonios. Solo se listan feedbacks con rating ≥ 4 o ya publicados. Endpoint público: GET /api/testimonials"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <Star className="h-5 w-5 text-amber-400" />
              <p className="text-sm text-white">
                <strong>{testimonialsPublishedCount}</strong> testimonios publicados actualmente
              </p>
            </div>

            {testimonialsLoading && testimonials.length === 0 ? (
              <p className="text-sm text-zinc-500">Cargando...</p>
            ) : testimonials.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-6 text-center">
                <Star className="mx-auto h-8 w-8 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-500">
                  Aún no hay feedbacks elegibles (rating ≥ 4).
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-150 overflow-y-auto">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-4 space-y-2 transition-colors ${
                      t.isPublicTestimonial
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-zinc-800 bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {t.rating && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`w-3 h-3 ${
                                  n <= t.rating!
                                    ? "text-fuchsia-400 fill-fuchsia-400"
                                    : "text-zinc-700"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-zinc-400">
                          {t.user.name || t.user.email}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {formatDate(t.createdAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTestimonial(t.id, !t.isPublicTestimonial)}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                          t.isPublicTestimonial
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-violet-500/40 hover:text-violet-300"
                        }`}
                      >
                        {t.isPublicTestimonial ? "✓ Publicado" : "Publicar"}
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300">{t.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminPanel>
      )}

      {/* ── Tab: Referidos ────────────────────────────────────────────────── */}
      {activeTab === "referidos" && (
        <>
          {referralsLoading && !referrals ? (
            <AdminPanel title="Programa de referidos">
              <p className="text-sm text-zinc-500">Cargando...</p>
            </AdminPanel>
          ) : !referrals ? (
            <AdminPanel title="Programa de referidos">
              <p className="text-sm text-zinc-500">Sin datos.</p>
            </AdminPanel>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <AdminMetricCard
                  label="Invitaciones creadas"
                  value={referrals.totalInvitationsCreated}
                  accent="emerald"
                  icon={<Users className="h-5 w-5" />}
                  hint={`+${referrals.generated7d} en 7d · +${referrals.generated30d} en 30d`}
                />
                <AdminMetricCard
                  label="Usadas"
                  value={referrals.totalInvitationsUsed}
                  accent="violet"
                  hint={`+${referrals.used7d} en 7d · +${referrals.used30d} en 30d`}
                />
                <AdminMetricCard
                  label="Tasa conversión"
                  value={`${(referrals.overallConversionRate * 100).toFixed(1)}%`}
                  accent="sky"
                  hint="Usadas / creadas"
                />
                <AdminMetricCard
                  label="Pendientes"
                  value={referrals.pending}
                  accent="amber"
                  hint={`${referrals.uniqueInviters} inviters únicos`}
                />
              </div>

              {/* Retención referidos vs no-referidos */}
              <AdminPanel
                title="Retención referidos vs no-referidos"
                tooltip="Compara el % de usuarios activos N días después del signup. Cohorte D7: signups 7–60 días atrás. Cohorte D30: signups 30–90 días atrás. Activo = lastSeen ≥ createdAt + N días."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    { label: "D7", data: referrals.retention.d7 },
                    { label: "D30", data: referrals.retention.d30 },
                  ] as const).map(({ label, data }) => {
                    const lift =
                      data.nonReferred > 0
                        ? (data.referred - data.nonReferred).toFixed(1)
                        : null;
                    return (
                      <div
                        key={label}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">
                            Retención {label}
                          </span>
                          {lift !== null && (
                            <span
                              className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                                Number(lift) >= 0
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-red-500/15 text-red-300 border border-red-500/30"
                              }`}
                            >
                              {Number(lift) >= 0 ? "+" : ""}
                              {lift} pp
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {[
                            {
                              cohortLabel: "Referidos",
                              pctVal: data.referred,
                              size: data.referredCohort,
                              color: "bg-violet-500/60",
                            },
                            {
                              cohortLabel: "No referidos",
                              pctVal: data.nonReferred,
                              size: data.nonReferredCohort,
                              color: "bg-zinc-600",
                            },
                          ].map((row) => (
                            <div key={row.cohortLabel}>
                              <div className="flex items-center justify-between mb-1 text-xs">
                                <span className="text-zinc-400">
                                  {row.cohortLabel}{" "}
                                  <span className="text-zinc-600">(n={row.size})</span>
                                </span>
                                <span className="font-semibold text-white">
                                  {row.pctVal.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${row.color} transition-all`}
                                  style={{ width: `${Math.min(row.pctVal, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminPanel>

              {/* Distribución por motivo */}
              <AdminPanel
                title="Distribución por motivo"
                tooltip="Cómo se ganan las invitaciones: racha 7d/30d, primer objetivo, 30 días activo, o asignación manual."
              >
                {referrals.byReason.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aún no hay invitaciones registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {referrals.byReason.map((r) => {
                      const maxGen = Math.max(
                        ...referrals.byReason.map((x) => x.generated),
                        1,
                      );
                      const widthGen = (r.generated / maxGen) * 100;
                      return (
                        <div
                          key={r.reason}
                          className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
                        >
                          <div className="flex items-center justify-between mb-1.5 text-sm">
                            <span className="text-white font-medium">
                              {REFERRAL_REASON_LABEL[r.reason] ?? r.reason}
                            </span>
                            <span className="text-xs text-zinc-400">
                              <span className="text-white font-semibold">{r.used}</span>
                              <span className="text-zinc-600"> / {r.generated} usadas</span>
                              <span className="ml-2 text-violet-300">
                                ({(r.conversionRate * 100).toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-violet-500/60"
                              style={{ width: `${Math.max(widthGen, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AdminPanel>

              {/* Timeline diaria */}
              <AdminPanel
                title="Actividad últimos 30 días"
                tooltip="Invitaciones generadas (violeta) y usadas (emerald) por día."
              >
                {(() => {
                  const max = Math.max(
                    ...referrals.dailyTimeline.map((d) =>
                      Math.max(d.generated, d.used),
                    ),
                    1,
                  );
                  return (
                    <div className="flex items-end gap-1 h-32">
                      {referrals.dailyTimeline.map((d) => {
                        const gH = (d.generated / max) * 100;
                        const uH = (d.used / max) * 100;
                        return (
                          <div
                            key={d.date}
                            className="flex-1 flex flex-col justify-end items-center gap-0.5"
                            title={`${d.date}: ${d.generated} generadas · ${d.used} usadas`}
                          >
                            <div className="w-full flex flex-col gap-px">
                              <div
                                className="w-full rounded-sm bg-violet-500/40"
                                style={{ height: `${Math.max(gH, d.generated > 0 ? 4 : 0)}%` }}
                              />
                              <div
                                className="w-full rounded-sm bg-emerald-500/60"
                                style={{ height: `${Math.max(uH, d.used > 0 ? 4 : 0)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="flex gap-4 text-xs text-zinc-500 mt-3 justify-center">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-violet-500/40" />
                    Generadas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500/60" />
                    Usadas
                  </span>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Top inviters"
                tooltip="Ranking por invitaciones usadas. 'Invites earned' es el contador interno de gamificación (no coincide necesariamente con invitaciones creadas)."
              >
                {referrals.topInviters.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nadie ha enviado invitaciones todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                          <th className="text-left py-2 px-3 font-semibold">Usuario</th>
                          <th className="text-right py-2 px-3 font-semibold">Creadas</th>
                          <th className="text-right py-2 px-3 font-semibold">Usadas</th>
                          <th className="text-right py-2 px-3 font-semibold">Conv.</th>
                          <th className="text-right py-2 px-3 font-semibold">Ganadas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.topInviters.map((r) => (
                          <tr
                            key={r.userId}
                            className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors"
                          >
                            <td className="py-2 px-3 text-white">
                              {r.name || r.email.split("@")[0]}
                              <span className="ml-2 text-[10px] text-zinc-600">{r.email}</span>
                            </td>
                            <td className="py-2 px-3 text-right text-zinc-300">{r.invitesCreated}</td>
                            <td className="py-2 px-3 text-right text-white font-semibold">
                              {r.invitesUsed}
                            </td>
                            <td className="py-2 px-3 text-right text-violet-300 font-semibold">
                              {(r.conversionRate * 100).toFixed(0)}%
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-300">{r.invitesEarned}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
