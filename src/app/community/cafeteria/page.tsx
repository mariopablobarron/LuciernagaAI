"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Send, Users, Sparkles, MessageCircleQuestion, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import AnonymousHint from "@/components/community/AnonymousHint";

// ─── Types ──────────────────────────────────────────────────────────────────

type MyResponse = {
  id: string;
  content: string;
  anonymous: boolean;
  createdAt: string;
};

type Mirror = {
  id: string;
  question: string;
  createdAt: string;
  isOwn: boolean;
};

type Response = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string } | null;
  reactions: Record<string, number>;
  myEmoji: string | null;
  mirrors: Mirror[];
};

type Payload = {
  round: { id: string; prompt: string; date: string } | null;
  me: { hasResponded: boolean; response: MyResponse | null };
  responses: Response[];
  allowedEmojis: string[];
  myCircle: { id: string; name: string } | null;
};

const LOCALE_BCP47: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CafeteriaPage() {
  const t = useTranslations("cafeteria");
  const locale = useLocale();
  const bcp = LOCALE_BCP47[locale] ?? "es-ES";

  const timeAgo = useCallback(
    (iso: string): string => {
      const diff = Date.now() - new Date(iso).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return t("timeAgo.now");
      if (min < 60) return t("timeAgo.minutes", { n: min });
      const h = Math.floor(min / 60);
      if (h < 24) return t("timeAgo.hours", { n: h });
      return t("timeAgo.days", { n: Math.floor(h / 24) });
    },
    [t],
  );

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mirrorFor, setMirrorFor] = useState<string | null>(null);
  const [mirrorText, setMirrorText] = useState("");
  const [mirrorPosting, setMirrorPosting] = useState(false);
  const [reportFor, setReportFor] = useState<{ kind: "response" | "mirror"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>("harmful");
  const [reportPosting, setReportPosting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/community/daily-round", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) { toast.error(t("toasts.sessionExpired")); return; }
        throw new Error("load failed");
      }
      const payload = (await res.json()) as Payload;
      setData(payload);
    } catch {
      toast.error(t("toasts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleSubmit() {
    const content = input.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/daily-round", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, anonymous }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? t("toasts.publishError"));
        return;
      }
      setInput("");
      toast.success(t("toasts.published"));
      await loadData();
    } catch {
      toast.error(t("toasts.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReact(responseId: string, emoji: string, current: string | null) {
    const nextEmoji = current === emoji ? null : emoji;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        responses: prev.responses.map((r) => {
          if (r.id !== responseId) return r;
          const counts = { ...r.reactions };
          if (current) counts[current] = Math.max(0, (counts[current] ?? 1) - 1);
          if (nextEmoji) counts[nextEmoji] = (counts[nextEmoji] ?? 0) + 1;
          return { ...r, reactions: counts, myEmoji: nextEmoji };
        }),
      };
    });
    try {
      const res = await fetch("/api/community/daily-round/reaction", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, emoji: nextEmoji }),
      });
      if (!res.ok) {
        await loadData();
        toast.error(t("toasts.reactionError"));
      }
    } catch {
      await loadData();
    }
  }

  async function handleReport() {
    if (!reportFor || reportPosting) return;
    setReportPosting(true);
    try {
      const payload = reportFor.kind === "response"
        ? { dailyRoundResponseId: reportFor.id, reason: reportReason }
        : { dailyRoundMirrorId: reportFor.id, reason: reportReason };
      const res = await fetch("/api/community/report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? t("toasts.reportError"));
        return;
      }
      setReportFor(null);
      setReportReason("harmful");
      toast.success(t("toasts.reported"));
      if (body.autoHidden) await loadData();
    } catch {
      toast.error(t("toasts.networkError"));
    } finally {
      setReportPosting(false);
    }
  }

  async function handleMirror() {
    if (!mirrorFor) return;
    const question = mirrorText.trim();
    if (!question || mirrorPosting) return;
    setMirrorPosting(true);
    try {
      const res = await fetch("/api/community/daily-round/mirror", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId: mirrorFor, question }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? t("toasts.mirrorError"));
        return;
      }
      setMirrorText("");
      setMirrorFor(null);
      toast.success(t("toasts.mirrorSent"));
      await loadData();
    } catch {
      toast.error(t("toasts.networkError"));
    } finally {
      setMirrorPosting(false);
    }
  }

  const myResponse = data?.me.response ?? null;
  const hasResponded = !!data?.me.hasResponded;
  const round = data?.round ?? null;
  const responses = data?.responses ?? [];
  const allowedEmojis = useMemo(() => data?.allowedEmojis ?? ["💓", "🫂", "🔥", "🌱", "✨"], [data]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/community" className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/50 border border-zinc-800/50">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{t("header.title")}</h1>
              <p className="text-[11px] text-zinc-500">{t("header.subtitle")}</p>
            </div>
          </div>
          {data?.myCircle && (
            <Link
              href="/community?tab=circle"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> {t("header.myCircleShort", { name: data.myCircle.name })}
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : !round ? (
          <EmptyState
            title={t("noRound.title")}
            body={t("noRound.body")}
          />
        ) : (
          <>
            {/* Prompt del día */}
            <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-zinc-900/50 to-fuchsia-500/5 p-6 space-y-2">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-violet-300">
                <Sparkles className="w-3.5 h-3.5" /> {t("prompt.eyebrow")}
              </div>
              <p className="text-lg sm:text-xl font-semibold leading-snug text-white">
                {round.prompt}
              </p>
              <p className="text-[11px] text-zinc-500">
                {new Date(round.date).toLocaleDateString(bcp, { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </section>

            {data?.myCircle && (
              <Link
                href="/community?tab=circle"
                className="sm:hidden flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-xs font-semibold text-violet-300"
              >
                <Users className="w-3.5 h-3.5" /> {t("header.myCircleLong", { name: data.myCircle.name })}
              </Link>
            )}

            {!hasResponded ? (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("compose.placeholder")}
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:outline-none"
                />
                <AnonymousHint />
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setAnonymous((v) => !v)}
                    className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <span className={`relative h-4 w-7 rounded-full transition-colors ${anonymous ? "bg-violet-600" : "bg-zinc-700"}`}>
                      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${anonymous ? "left-[14px]" : "left-0.5"}`} />
                    </span>
                    {anonymous ? t("compose.anonymous") : t("compose.named")}
                  </button>
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={!input.trim() || submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t("compose.publish")}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600">{t("compose.hint")}</p>
              </section>
            ) : (
              <>
                {myResponse && (
                  <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-cyan-300">
                      {t("mine.eyebrow", { time: timeAgo(myResponse.createdAt) })}
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap">{myResponse.content}</p>
                    <p className="text-[11px] text-zinc-500">
                      {myResponse.anonymous ? t("mine.asAnonymous") : t("mine.asNamed")}
                    </p>
                  </section>
                )}

                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                    {t("others.title")}
                    <span className="text-xs text-zinc-600">{t("others.count", { n: responses.length })}</span>
                  </h2>

                  {responses.length === 0 ? (
                    <EmptyState
                      title={t("othersEmpty.title")}
                      body={t("othersEmpty.body")}
                    />
                  ) : (
                    responses.map((r) => (
                      <article key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                        <p className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">{r.content}</p>

                        <div className="flex items-center justify-between text-[11px] text-zinc-600">
                          <span>{r.author?.name ?? t("others.anonymousName")} · {timeAgo(r.createdAt)}</span>
                          <button
                            onClick={() => setReportFor({ kind: "response", id: r.id })}
                            className="inline-flex items-center gap-1 text-zinc-600 hover:text-rose-400 transition-colors"
                            aria-label={t("others.reportAria")}
                            title={t("others.reportTitle")}
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </div>

                        {reportFor?.kind === "response" && reportFor.id === r.id && (
                          <ReportForm
                            reason={reportReason}
                            setReason={setReportReason}
                            onCancel={() => setReportFor(null)}
                            onSubmit={handleReport}
                            posting={reportPosting}
                          />
                        )}

                        <div className="flex flex-wrap items-center gap-1.5">
                          {allowedEmojis.map((emoji) => {
                            const count = r.reactions[emoji] ?? 0;
                            const mine = r.myEmoji === emoji;
                            return (
                              <button
                                key={emoji}
                                onClick={() => void handleReact(r.id, emoji, r.myEmoji)}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all active:scale-95 ${
                                  mine
                                    ? "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-100"
                                    : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600 hover:text-white"
                                }`}
                                aria-label={t("others.reactAria", { emoji })}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="text-[10px] font-semibold">{count}</span>}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => { setMirrorFor(r.id); setMirrorText(""); }}
                            disabled={r.mirrors.some((m) => m.isOwn) || r.mirrors.length >= 3}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={
                              r.mirrors.some((m) => m.isOwn)
                                ? t("others.mirrorDisabledOwn")
                                : r.mirrors.length >= 3
                                ? t("others.mirrorDisabledFull")
                                : t("others.mirrorEnabled")
                            }
                          >
                            <MessageCircleQuestion className="w-3 h-3" />
                            {t("others.mirrorBtn")}
                          </button>
                        </div>

                        {mirrorFor === r.id && (
                          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
                            <p className="text-[11px] text-violet-300">{t("mirror.hint")}</p>
                            <input
                              value={mirrorText}
                              onChange={(e) => setMirrorText(e.target.value)}
                              maxLength={180}
                              placeholder={t("mirror.placeholder")}
                              className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                              onKeyDown={(e) => { if (e.key === "Enter" && mirrorText.trim()) void handleMirror(); }}
                              autoFocus
                            />
                            <AnonymousHint />
                            <div className="flex gap-2">
                              <button
                                onClick={() => void handleMirror()}
                                disabled={!mirrorText.trim() || mirrorPosting}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                              >
                                {mirrorPosting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                {t("mirror.send")}
                              </button>
                              <button
                                onClick={() => { setMirrorFor(null); setMirrorText(""); }}
                                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                              >
                                {t("mirror.cancel")}
                              </button>
                            </div>
                          </div>
                        )}

                        {r.mirrors.length > 0 && (
                          <div className="border-t border-zinc-800 pt-3 space-y-2">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-600">{t("mirrorList.title")}</p>
                            {r.mirrors.map((m) => (
                              <div key={m.id} className="space-y-1">
                                <div className="flex items-start gap-2 text-xs text-zinc-400">
                                  <MessageCircleQuestion className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" />
                                  <p className="leading-relaxed flex-1">
                                    <span className="text-zinc-200">{m.question}</span>
                                    <span className="text-zinc-600"> · {m.isOwn ? t("mirrorList.you") : t("mirrorList.anonymous")} · {timeAgo(m.createdAt)}</span>
                                  </p>
                                  {!m.isOwn && (
                                    <button
                                      onClick={() => setReportFor({ kind: "mirror", id: m.id })}
                                      className="text-zinc-600 hover:text-rose-400 shrink-0"
                                      aria-label={t("mirrorList.reportAria")}
                                      title={t("mirrorList.reportTitle")}
                                    >
                                      <Flag className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {reportFor?.kind === "mirror" && reportFor.id === m.id && (
                                  <ReportForm
                                    reason={reportReason}
                                    setReason={setReportReason}
                                    onCancel={() => setReportFor(null)}
                                    onSubmit={handleReport}
                                    posting={reportPosting}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReportForm({
  reason, setReason, onCancel, onSubmit, posting,
}: {
  reason: string;
  setReason: (r: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  posting: boolean;
}) {
  const t = useTranslations("cafeteria.report");
  const REASONS: { value: string; labelKey: "harmful" | "self_harm" | "harassment" | "spam" | "other" }[] = [
    { value: "harmful", labelKey: "harmful" },
    { value: "self_harm", labelKey: "self_harm" },
    { value: "harassment", labelKey: "harassment" },
    { value: "spam", labelKey: "spam" },
    { value: "other", labelKey: "other" },
  ];
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
      <p className="text-[11px] text-rose-300">{t("title")}</p>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setReason(r.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              reason === r.value
                ? "border-rose-500/60 bg-rose-500/20 text-rose-100"
                : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:text-white"
            }`}
          >
            {t(`reasons.${r.labelKey}`)}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={posting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
        >
          {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
          {t("submit")}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center space-y-2">
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">{body}</p>
    </div>
  );
}
