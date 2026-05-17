"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import {
  ENNEAGRAM_TYPE_DESCRIPTIONS,
  ENNEAGRAM_TYPE_NAMES,
  getOrderedItems,
  type EnneagramType,
  type LikertAnswer,
} from "@/data/enneagram-oeps";

const STORAGE_KEY = "enneagram:draft:v1";
const PAGE_SIZE = 10;

const LOCALE_BCP47: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
};

type ResultPayload = {
  assessmentId: string;
  dominantType: EnneagramType;
  wing: EnneagramType | null;
  scoresByType: Record<`type${EnneagramType}`, number>;
  ranking: Array<{ type: EnneagramType; score: number }>;
};

type ExistingAssessment = {
  id: string;
  dominantType: number;
  wing: number | null;
  scoresByType: Record<`type${EnneagramType}`, number>;
  completedAt: string;
};

export default function EnneagramPage() {
  const router = useRouter();
  const t = useTranslations("enneagram");
  const locale = useLocale();
  const bcp = LOCALE_BCP47[locale] ?? "es-ES";
  const items = useMemo(() => getOrderedItems(), []);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  const likertLabels: Record<LikertAnswer, string> = useMemo(
    () => ({
      1: t("likert.1"),
      2: t("likert.2"),
      3: t("likert.3"),
      4: t("likert.4"),
      5: t("likert.5"),
    }),
    [t],
  );

  const [phase, setPhase] = useState<"loading" | "intro" | "running" | "submitting" | "result">(
    "loading"
  );
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LikertAnswer>>({});
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [existing, setExisting] = useState<ExistingAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial: ¿tiene resultado previo? + draft local.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/enneagram/me", { credentials: "include" });
        if (res.status === 401) {
          router.replace("/app/inicio?next=/profile/eneagrama");
          return;
        }
        const data = (await res.json()) as { assessment: ExistingAssessment | null };
        if (!cancelled && data.assessment) {
          setExisting(data.assessment);
        }
      } catch {
        // ignore — el test funciona sin backend hasta el submit.
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { answers?: Record<string, LikertAnswer>; page?: number };
          if (parsed.answers && typeof parsed.answers === "object") {
            setAnswers(parsed.answers);
          }
          if (typeof parsed.page === "number") {
            setPage(Math.max(0, Math.min(totalPages - 1, parsed.page)));
          }
        }
      } catch {
        // ignore
      }

      if (!cancelled) setPhase("intro");
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, totalPages]);

  // Autosave por respuesta.
  useEffect(() => {
    if (phase !== "running") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, page }));
    } catch {
      // ignore — quota / privacidad estricta.
    }
  }, [answers, page, phase]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = items.length;
  const progress = Math.round((answeredCount / totalCount) * 100);

  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allCurrentAnswered = pageItems.every((it) => answers[it.id] !== undefined);

  const handleAnswer = useCallback((id: string, value: LikertAnswer) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/enneagram/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as Partial<ResultPayload> & { success?: boolean; error?: string };
      if (!res.ok || !data.success || !data.dominantType) {
        setError(t("running.submitError"));
        setPhase("running");
        return;
      }
      setResult({
        assessmentId: data.assessmentId!,
        dominantType: data.dominantType,
        wing: data.wing ?? null,
        scoresByType: data.scoresByType!,
        ranking: data.ranking!,
      });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setPhase("result");
    } catch {
      setError(t("running.offlineError"));
      setPhase("running");
    }
  }, [answers, t]);

  const handleReset = useCallback(() => {
    setAnswers({});
    setPage(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPhase("running");
  }, []);

  const [declareOpen, setDeclareOpen] = useState(false);
  const [declareType, setDeclareType] = useState<EnneagramType | "">("");
  const [declareWing, setDeclareWing] = useState<number | "">("");
  const [declareSubmitting, setDeclareSubmitting] = useState(false);
  const [declareError, setDeclareError] = useState<string | null>(null);

  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleDeleteExisting = useCallback(async () => {
    if (!confirm(t("intro.existing.deleteConfirm"))) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch("/api/enneagram/me/delete", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setExisting(null);
      }
    } catch {
      // ignore — el botón se reactiva
    } finally {
      setDeleteSubmitting(false);
    }
  }, [t]);

  const handleDeclare = useCallback(async () => {
    if (!declareType) return;
    setDeclareSubmitting(true);
    setDeclareError(null);
    try {
      const res = await fetch("/api/enneagram/declare", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dominantType: Number(declareType),
          wing: declareWing === "" ? null : Number(declareWing),
        }),
      });
      const data = (await res.json()) as { success?: boolean; assessmentId?: string };
      if (!res.ok || !data.success) {
        setDeclareError(t("intro.declare.saveError"));
        return;
      }
      setExisting({
        id: data.assessmentId!,
        dominantType: Number(declareType),
        wing: declareWing === "" ? null : Number(declareWing),
        scoresByType: {} as Record<`type${EnneagramType}`, number>,
        completedAt: new Date().toISOString(),
      });
      setDeclareOpen(false);
    } catch {
      setDeclareError(t("intro.declare.offlineError"));
    } finally {
      setDeclareSubmitting(false);
    }
  }, [declareType, declareWing, t]);

  if (phase === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-zinc-400">
        {t("loading")}
      </main>
    );
  }

  if (phase === "result" && result) {
    return <ResultView result={result} onReset={handleReset} />;
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" /> {t("backToProfile")}
          </Link>
        </div>
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
            {t("intro.eyebrow")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            {t("intro.title")}
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
            {t("intro.description")}
          </p>
        </header>

        <ul className="space-y-2 text-sm text-zinc-400">
          <li>• {t("intro.bullets.duration")}</li>
          <li>• {t("intro.bullets.pause")}</li>
          <li>• {t("intro.bullets.storage")}</li>
        </ul>

        {existing ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
            <p className="text-sm text-emerald-200 font-semibold">
              {t("intro.existing.title")}
            </p>
            <p className="text-sm text-zinc-300">
              {t("intro.existing.dominantLabel")}{" "}
              <span className="font-bold text-white">
                {t("intro.existing.typeFormat", {
                  name: ENNEAGRAM_TYPE_NAMES[existing.dominantType as EnneagramType],
                  n: existing.dominantType,
                })}
              </span>
              {existing.wing ? t("intro.existing.wingSuffix", { n: existing.wing }) : null}
            </p>
            <p className="text-xs text-zinc-500">
              {t("intro.existing.completedAt", {
                date: new Date(existing.completedAt).toLocaleDateString(bcp, { dateStyle: "long" }),
              })}
            </p>
            <button
              type="button"
              onClick={handleDeleteExisting}
              disabled={deleteSubmitting}
              className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 disabled:opacity-50"
            >
              {deleteSubmitting ? t("intro.existing.deleting") : t("intro.existing.delete")}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPhase("running")}
            className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 px-5 py-3 text-base font-bold text-white transition-colors"
          >
            {answeredCount > 0
              ? t("intro.actions.continue", { answered: answeredCount, total: totalCount })
              : t("intro.actions.start")}
          </button>
          {answeredCount > 0 ? (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-zinc-700 hover:bg-zinc-800 px-4 py-3 text-sm text-zinc-300 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" /> {t("intro.actions.restart")}
            </button>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
          {!declareOpen ? (
            <>
              <p className="text-sm text-zinc-300">{t("intro.declare.prompt")}</p>
              <button
                type="button"
                onClick={() => setDeclareOpen(true)}
                className="text-sm font-semibold text-fuchsia-300 hover:text-fuchsia-200 underline underline-offset-2"
              >
                {t("intro.declare.open")}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">{t("intro.declare.helper")}</p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  <span>{t("intro.declare.typeLabel")}</span>
                  <select
                    value={declareType}
                    onChange={(e) => setDeclareType(e.target.value === "" ? "" : (Number(e.target.value) as EnneagramType))}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-fuchsia-500 focus:outline-none"
                  >
                    <option value="">{t("intro.declare.typePlaceholder")}</option>
                    {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((typeNum) => (
                      <option key={typeNum} value={typeNum}>
                        {t("intro.declare.typeOption", { n: typeNum, name: ENNEAGRAM_TYPE_NAMES[typeNum] })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  <span>{t("intro.declare.wingLabel")}</span>
                  <select
                    value={declareWing}
                    onChange={(e) => setDeclareWing(e.target.value === "" ? "" : Number(e.target.value))}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-fuchsia-500 focus:outline-none"
                    disabled={!declareType}
                  >
                    <option value="">{t("intro.declare.wingNone")}</option>
                    {declareType
                      ? [
                          declareType === 1 ? 9 : declareType - 1,
                          declareType === 9 ? 1 : declareType + 1,
                        ].map((w) => (
                          <option key={w} value={w}>
                            {t("intro.declare.wingOption", { n: w, name: ENNEAGRAM_TYPE_NAMES[w as EnneagramType] })}
                          </option>
                        ))
                      : null}
                  </select>
                </label>
              </div>
              {declareType ? (
                <p className="text-xs text-zinc-500 italic">
                  {ENNEAGRAM_TYPE_DESCRIPTIONS[declareType as EnneagramType]}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDeclare}
                  disabled={!declareType || declareSubmitting}
                  className="rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                >
                  {declareSubmitting ? t("intro.declare.submitting") : t("intro.declare.submit")}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeclareOpen(false); setDeclareError(null); }}
                  disabled={declareSubmitting}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {t("intro.declare.cancel")}
                </button>
              </div>
              {declareError ? <p className="text-xs text-red-400">{declareError}</p> : null}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>{t("running.blockProgress", { page: page + 1, total: totalPages })}</span>
          <span>{t("running.answeredCount", { answered: answeredCount, total: totalCount })}</span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-fuchsia-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">{t("running.autosave")}</p>
      </div>

      <ol className="space-y-5">
        {pageItems.map((item, idx) => (
          <li key={item.id} className="space-y-3">
            <p className="text-base sm:text-lg text-zinc-100 leading-relaxed">
              <span className="text-zinc-500 mr-2">{page * PAGE_SIZE + idx + 1}.</span>
              {item.text}
            </p>
            <div
              role="radiogroup"
              aria-label={item.text}
              className="flex flex-wrap gap-2"
            >
              {([1, 2, 3, 4, 5] as LikertAnswer[]).map((v) => {
                const selected = answers[item.id] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleAnswer(item.id, v)}
                    className={`rounded-lg px-3 py-2 text-sm border transition-colors min-w-11 ${
                      selected
                        ? "bg-fuchsia-600 border-fuchsia-500 text-white font-bold"
                        : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="block text-base font-bold">{v}</span>
                    <span className="block text-[10px] opacity-80">{likertLabels[v]}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 px-3 py-2 text-sm text-zinc-300 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> {t("running.prev")}
        </button>

        {page < totalPages - 1 ? (
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={!allCurrentAnswered}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {t("running.next")} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!allCurrentAnswered || phase === "submitting"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {phase === "submitting" ? t("running.submitting") : t("running.submit")}
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </main>
  );
}

function ResultView({ result, onReset }: { result: ResultPayload; onReset: () => void }) {
  const t = useTranslations("enneagram.result");
  const dominantName = ENNEAGRAM_TYPE_NAMES[result.dominantType];
  const dominantDesc = ENNEAGRAM_TYPE_DESCRIPTIONS[result.dominantType];
  const top3 = result.ranking.slice(0, 3);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">
      <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> {t("eyebrow")}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {dominantName}{" "}
          <span className="text-fuchsia-300">{t("typeSuffix", { n: result.dominantType })}</span>
          {result.wing ? (
            <span className="text-zinc-400 text-2xl"> {t("wingSuffix", { n: result.wing })}</span>
          ) : null}
        </h1>
        <p className="text-base text-zinc-200 leading-relaxed">{dominantDesc}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-300">{t("mentorTitle")}</p>
        <p className="text-sm text-zinc-400 leading-relaxed">{t("mentorBody")}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-300">{t("topTitle")}</p>
        <ul className="space-y-2">
          {top3.map((r) => {
            const max = top3[0].score;
            const pct = max > 0 ? Math.round((r.score / max) * 100) : 0;
            return (
              <li key={r.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-200">
                    {t("rankingItem", { n: r.type, name: ENNEAGRAM_TYPE_NAMES[r.type] })}
                  </span>
                  <span className="text-zinc-500 font-mono">{r.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-fuchsia-500/70" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/app"
          className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 px-5 py-3 text-base font-bold text-white transition-colors"
        >
          {t("backToChat")}
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-zinc-700 hover:bg-zinc-800 px-4 py-3 text-sm text-zinc-300 inline-flex items-center gap-1.5"
        >
          <RotateCcw className="h-4 w-4" /> {t("repeat")}
        </button>
      </div>
    </main>
  );
}
