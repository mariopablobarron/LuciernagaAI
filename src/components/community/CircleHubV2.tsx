"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Activity, Clock, Send, Mail, Users, Inbox, Archive } from "lucide-react";

type CircleData = {
  id: string;
  name: string;
  matchPattern: string;
  matchEmotion: string;
  cycleEndsAt: string | null;
  maxMembers: number;
};

type PulseResponse = {
  id: string;
  content: string;
  submittedAt: string;
  editedAt: string | null;
};

type PeerResponse = { id: string; content: string | null; submittedAt: string };

type PulseData = {
  id: string;
  prompt: string;
  weekStart: string;
  weekEnd: string;
  openedAt: string;
  myResponse: PulseResponse | null;
  responseCount: number;
  peerResponses: PeerResponse[];
};

type Reflection = {
  id: string;
  content: string;
  publishedAt: string | null;
  readAt: string | null;
  prompt: string;
  weekStart: string;
};

const LOCALE_BCP47: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
};

function daysBetween(target: string): number {
  const diff = new Date(target).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function CircleHubV2() {
  const t = useTranslations("circleHub");
  const locale = useLocale();
  const bcp = LOCALE_BCP47[locale] ?? "es-ES";

  const formatDate = useCallback(
    (iso: string): string =>
      new Date(iso).toLocaleDateString(bcp, { day: "2-digit", month: "short" }),
    [bcp],
  );

  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState<CircleData | null>(null);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pulseRes, reflectionsRes] = await Promise.all([
        fetch("/api/community/circle/pulse/current", { credentials: "include" }),
        fetch("/api/community/circle/reflections", { credentials: "include" }),
      ]);
      if (pulseRes.ok) {
        const data = (await pulseRes.json()) as { circle: CircleData | null; pulse: PulseData | null };
        setCircle(data.circle);
        setPulse(data.pulse);
        if (data.pulse?.myResponse) setDraft(data.pulse.myResponse.content);
        else setDraft("");
      }
      if (reflectionsRes.ok) {
        const data = (await reflectionsRes.json()) as { reflections: Reflection[] };
        setReflections(data.reflections);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!pulse || !draft.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/circle/pulse/${pulse.id}/respond`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error === "PULSE_CLOSED" ? t("pulse.toasts.closed") : t("pulse.toasts.saveError"));
        return;
      }
      toast.success(pulse.myResponse ? t("pulse.toasts.updated") : t("pulse.toasts.shared"));
      void load();
    } finally {
      setSubmitting(false);
    }
  }

  async function markRead(reflectionId: string) {
    await fetch("/api/community/circle/reflections", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflectionId, action: "mark-read" }),
    }).catch(() => {});
    setReflections((prev) => prev.map((r) => r.id === reflectionId ? { ...r, readAt: new Date().toISOString() } : r));
  }

  if (loading) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">{t("loading")}</div>;
  }

  if (!circle) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3 text-center">
        <Users className="h-6 w-6 text-zinc-500 mx-auto" />
        <p className="text-sm text-zinc-300 font-semibold">{t("noCircle.title")}</p>
        <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
          {t("noCircle.description")}
        </p>
        <p className="text-[11px] text-zinc-600">{t("noCircle.note")}</p>
      </div>
    );
  }

  const daysToCycleEnd = circle.cycleEndsAt ? daysBetween(circle.cycleEndsAt) : null;
  const daysToPulseEnd = pulse ? daysBetween(pulse.weekEnd) : null;
  const hasResponded = Boolean(pulse?.myResponse);
  const showPeers = hasResponded && pulse && pulse.peerResponses.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-lg font-bold text-white">{circle.name}</p>
            <p className="text-xs text-zinc-400 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[11px] font-mono">
                {circle.matchEmotion} · {circle.matchPattern}
              </span>
            </p>
          </div>
          {daysToCycleEnd !== null && (
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase font-semibold text-zinc-500">{t("header.cycle")}</p>
              <p className="text-xs text-zinc-300">{t("header.daysRemaining", { days: daysToCycleEnd })}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pulse */}
      {!pulse ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-center space-y-2">
          <Clock className="h-5 w-5 text-zinc-500 mx-auto" />
          <p className="text-sm text-zinc-300 font-semibold">{t("noPulse.title")}</p>
          <p className="text-xs text-zinc-500">{t("noPulse.description")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">{t("pulse.eyebrow")}</p>
              <p className="text-base text-white mt-1 leading-relaxed">{pulse.prompt}</p>
            </div>
            <div className="text-right shrink-0 text-xs">
              <p className="text-zinc-300">{t("pulse.daysShort", { days: daysToPulseEnd ?? 0 })}</p>
              <p className="text-zinc-600 text-[10px]">{t("pulse.toClose")}</p>
            </div>
          </div>

          {/* Response area */}
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("pulse.placeholder")}
              rows={4}
              maxLength={1500}
              className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-zinc-500">
                {hasResponded ? t("pulse.alreadyResponded") : t("pulse.anonymous")} · {draft.length}/1500
              </p>
              <button
                onClick={() => void submit()}
                disabled={submitting || !draft.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
                {hasResponded ? t("pulse.update") : t("pulse.share")}
              </button>
            </div>
          </div>

          {/* Participation indicator */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-2 border-t border-cyan-500/10">
            <Activity className="h-3 w-3" />
            <span>{t("pulse.participation", { count: pulse.responseCount, max: circle.maxMembers })}</span>
            {!hasResponded && (
              <span className="text-cyan-400">{t("pulse.unlockHint")}</span>
            )}
          </div>
        </div>
      )}

      {/* Peer responses (post-respond) */}
      {showPeers && pulse && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Inbox className="h-3.5 w-3.5" /> {t("peers.title")}
          </p>
          {pulse.peerResponses.filter((p) => p.content !== null).length === 0 ? (
            <p className="text-xs text-zinc-500">{t("peers.empty")}</p>
          ) : (
            <div className="space-y-2">
              {pulse.peerResponses.filter((p) => p.content !== null).map((p) => (
                <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{p.content}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{formatDate(p.submittedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mentor reflections */}
      {reflections.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> {t("reflections.title")}
          </p>
          <div className="space-y-3">
            {reflections.slice(0, 3).map((r) => (
              <button
                key={r.id}
                onClick={() => !r.readAt && void markRead(r.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  r.readAt
                    ? "border-zinc-800 bg-zinc-950/50"
                    : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15"
                }`}
              >
                <p className="text-[10px] text-amber-300/70 mb-1 italic">&laquo;{r.prompt}&raquo;</p>
                <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                <p className="text-[10px] text-zinc-600 mt-2">
                  {r.publishedAt && formatDate(r.publishedAt)}
                  {!r.readAt && <span className="ml-2 text-amber-400">{t("reflections.unread")}</span>}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Archive link */}
      <Link
        href="/community/cartas"
        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 hover:bg-zinc-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-zinc-500" />
          <span className="text-sm text-zinc-300">{t("archive")}</span>
        </div>
        <span className="text-xs text-zinc-500">→</span>
      </Link>
    </div>
  );
}
