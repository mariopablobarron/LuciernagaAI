"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Link2 } from "lucide-react";
import { COMPONENTS } from "@/styles/design-system";
import PrivacyCheckbox from "@/components/PrivacyCheckbox";
import { trackEvent } from "@/lib/analytics";
import { trackMetaEvent } from "@/lib/meta-pixel";

type EmotionalState = "bloqueo" | "ansiedad" | "duda" | "claridad" | "neutral";

// ─── Scoring table (no copy, solo lógica). El copy va por messages.test.*  ──
// 5 preguntas × 4 opciones cada una. Por opción, qué estados puntúa.
type ScoreMap = Partial<Record<EmotionalState, number>>;

const QUESTIONS: { id: number; options: ScoreMap[] }[] = [
  {
    id: 1,
    options: [
      { bloqueo: 3 },
      { ansiedad: 3 },
      { duda: 3 },
      { claridad: 3 },
    ],
  },
  {
    id: 2,
    options: [
      { bloqueo: 3 },
      { ansiedad: 3 },
      { duda: 3 },
      { claridad: 3 },
    ],
  },
  {
    id: 3,
    options: [
      { bloqueo: 3, duda: 1 },
      { ansiedad: 3 },
      { duda: 3 },
      { claridad: 2, neutral: 1 },
    ],
  },
  {
    id: 4,
    options: [
      { bloqueo: 3 },
      { ansiedad: 3 },
      { duda: 3 },
      { claridad: 3 },
    ],
  },
  {
    id: 5,
    options: [
      { bloqueo: 3 },
      { ansiedad: 3 },
      { duda: 3 },
      { claridad: 3 },
    ],
  },
];

// ─── Estilos por estado (copy via messages.test.result.<state>.*) ────────────
type StateStyle = {
  emoji: string;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
};

const STATE_STYLES: Record<EmotionalState, StateStyle> = {
  bloqueo: { emoji: "🧱", accentColor: "text-orange-400", borderColor: "border-orange-500/40", badgeBg: "bg-orange-500/15" },
  ansiedad: { emoji: "⚡", accentColor: "text-yellow-400", borderColor: "border-yellow-500/40", badgeBg: "bg-yellow-500/15" },
  duda: { emoji: "🌫️", accentColor: "text-blue-400", borderColor: "border-blue-500/40", badgeBg: "bg-blue-500/15" },
  claridad: { emoji: "✨", accentColor: "text-indigo-400", borderColor: "border-indigo-500/40", badgeBg: "bg-indigo-500/15" },
  neutral: { emoji: "🔵", accentColor: "text-zinc-400", borderColor: "border-zinc-500/40", badgeBg: "bg-zinc-500/15" },
};

function calculateState(answers: (number | null)[]): EmotionalState {
  const scores: Record<EmotionalState, number> = {
    neutral: 0,
    duda: 0,
    bloqueo: 0,
    ansiedad: 0,
    claridad: 0,
  };

  answers.forEach((selectedIdx, qi) => {
    if (selectedIdx === null) return;
    const scoreMap = QUESTIONS[qi]?.options[selectedIdx];
    if (!scoreMap) return;
    Object.entries(scoreMap).forEach(([state, score]) => {
      scores[state as EmotionalState] += score;
    });
  });

  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as EmotionalState;
}

function ShareButtons({ stateLabel, stateEmoji }: { stateLabel: string; stateEmoji: string }) {
  const t = useTranslations("test");
  const [copied, setCopied] = useState(false);

  const shareText = t("shareText", { emoji: stateEmoji, state: stateLabel });
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/test` : "/test";
  const fullText = `${shareText} ${t("shareTagline")}: ${shareUrl}`;

  function handleTwitter() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(fullText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 text-center uppercase tracking-widest font-semibold">
        {t("shareHeader")}
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleTwitter}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-11 rounded-xl border border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors text-sm"
        >
          𝕏 Twitter
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-11 rounded-xl border border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors text-sm"
        >
          WhatsApp
        </button>
        <button
          onClick={handleCopy}
          title={t("shareCopyTitle")}
          className="flex items-center justify-center gap-2 px-4 py-3 min-h-11 rounded-xl border border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors text-sm"
        >
          {copied ? <span className="text-violet-400">✓</span> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

type Screen = "intro" | "quiz" | "email" | "result";

export default function TestPage() {
  const t = useTranslations("test");
  const [screen, setScreen] = useState<Screen>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailConsent, setEmailConsent] = useState(false);
  const [result, setResult] = useState<EmotionalState | null>(null);
  const [previousState, setPreviousState] = useState<EmotionalState | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOptionSelect(optionIdx: number) {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);

    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIdx;
    setAnswers(newAnswers);

    autoAdvanceTimer.current = setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ((q) => q + 1);
      } else {
        const state = calculateState(newAnswers);
        setResult(state);
        trackEvent("quiz_completed", { result: state });
        setScreen("email");
        fetch("/api/quiz/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        })
          .then((r) => r.json())
          .then((data: { previousState?: string }) => {
            const ps = data.previousState;
            if (ps && ["bloqueo", "ansiedad", "duda", "claridad", "neutral"].includes(ps)) {
              setPreviousState(ps as EmotionalState);
            }
          })
          .catch(() => { /* Best-effort previous state fetch */ });
      }
    }, 450);
  }

  function handleBack() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    } else {
      setScreen("intro");
    }
  }

  async function handleEmailSubmit(skip = false) {
    if (!skip && email.trim()) {
      setEmailStatus("sending");
      try {
        const res = await fetch("/api/auth/capture-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        setEmailStatus(res.ok ? "sent" : "error");
        if (res.ok) {
          trackMetaEvent("Lead", { content_name: "quiz_email" });
        }
        if (res.ok && result) {
          fetch("/api/quiz/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim(), state: result }),
          }).catch(() => { /* Fire-and-forget email delivery */ });
          fetch("/api/quiz/followup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          }).catch(() => { /* Fire-and-forget */ });
        }
      } catch {
        setEmailStatus("error");
      }
    }
    setScreen("result");
  }

  const currentAnswer = answers[currentQ];
  const progress = ((currentQ + 1) / QUESTIONS.length) * 100;

  if (screen === "intro") {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              {t("introEyebrow")}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {t("introTitle")}{" "}
              <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                {t("introTitleHighlight")}
              </span>
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed">
              {t("introSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 py-2">
            {(["bloqueo", "ansiedad", "duda"] as const).map((id) => (
              <div
                key={id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center space-y-2"
              >
                <div className="text-2xl">{STATE_STYLES[id].emoji}</div>
                <div className="text-xs text-zinc-400 font-medium">
                  {t(`introPreview.${id}`)}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setScreen("quiz")}
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center justify-center gap-2 px-8 py-4 text-base w-full sm:w-auto`}
          >
            {t("introCta")} <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-xs text-zinc-500">{t("introFootnote")}</p>
        </div>
      </div>
    );
  }

  if (screen === "quiz") {
    const question = QUESTIONS[currentQ];
    const qKey = `q${question.id}`;
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>
                {t("quizProgress", { current: currentQ + 1, total: QUESTIONS.length })}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className={COMPONENTS.progressBar}>
              <div
                className={`${COMPONENTS.progressFill} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-semibold leading-snug">
              {t(`question.${qKey}.text`)}
            </h2>

            <div className="space-y-3">
              {question.options.map((_scoreMap, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-150 ${
                    currentAnswer === idx
                      ? "border-violet-500 bg-violet-500/15 text-white"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                        currentAnswer === idx
                          ? "border-violet-400 bg-violet-400"
                          : "border-zinc-600"
                      }`}
                    />
                    <span className="text-sm leading-relaxed">
                      {t(`question.${qKey}.option${idx + 1}`)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="px-5 py-3 min-h-11 border border-zinc-700 text-zinc-400 font-medium rounded-xl hover:bg-zinc-900/50 transition-colors text-sm"
            >
              {t("quizBack")}
            </button>
            {currentAnswer !== null && (
              <p className="text-xs text-zinc-600 animate-pulse">{t("quizContinuing")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "email") {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-3">
            <div className="text-3xl">📬</div>
            <h2 className="text-2xl font-bold">{t("emailTitle")}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">{t("emailDesc")}</p>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={COMPONENTS.inputField}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim()) void handleEmailSubmit(false);
              }}
            />
            <PrivacyCheckbox
              checked={emailConsent}
              onChange={setEmailConsent}
              context={t("emailConsent")}
            />
            <button
              onClick={() => void handleEmailSubmit(false)}
              disabled={!email.trim() || !emailConsent || emailStatus === "sending"}
              className={`${COMPONENTS.buttonPrimary} w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {emailStatus === "sending" ? t("emailSending") : t("emailSeeResult")}
            </button>
          </div>

          <button
            onClick={() => void handleEmailSubmit(true)}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-3 min-h-11 block w-full"
          >
            {t("emailSkip")}
          </button>
        </div>
      </div>
    );
  }

  // Result screen
  if (screen === "result" && result) {
    const style = STATE_STYLES[result];
    const stateLabel = t(`result.${result}.label`);
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full space-y-8">
          {/* Header result */}
          <div className="text-center space-y-4">
            <div className="text-5xl">{style.emoji}</div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${style.badgeBg} ${style.borderColor}`}>
              <span className={`text-sm font-semibold ${style.accentColor}`}>{stateLabel}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold leading-snug">
              {t(`result.${result}.tagline`)}
            </h2>
          </div>

          {/* Progress comparison — only shown if user has a previous result */}
          {previousState && previousState !== result && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                {t("evolutionTitle")}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
                  <div className="text-xl mb-1">{STATE_STYLES[previousState].emoji}</div>
                  <div className="text-xs text-zinc-400 font-medium">{t(`result.${previousState}.label`)}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{t("evolutionBefore")}</div>
                </div>
                <div className="text-zinc-600 text-lg">→</div>
                <div className={`flex-1 text-center px-3 py-2.5 rounded-lg border ${style.badgeBg} ${style.borderColor}`}>
                  <div className="text-xl mb-1">{style.emoji}</div>
                  <div className={`text-xs font-semibold ${style.accentColor}`}>{stateLabel}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{t("evolutionNow")}</div>
                </div>
              </div>
              {(previousState === "bloqueo" || previousState === "ansiedad") &&
                (result === "claridad" || result === "duda") && (
                  <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                    {t("evolutionImproved")}
                  </p>
                )}
              {result === "bloqueo" || result === "ansiedad" ? (
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  {t("evolutionHarder")}
                </p>
              ) : null}
            </div>
          )}

          {/* Pattern */}
          <div className={`rounded-xl border ${style.borderColor} ${style.badgeBg} p-5 space-y-2`}>
            <p className={`text-xs font-semibold uppercase tracking-widest ${style.accentColor}`}>
              {t("patternHeader")}
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{t(`result.${result}.pattern`)}</p>
          </div>

          {/* Signal */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {t("signalHeader")}
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{t(`result.${result}.signal`)}</p>
          </div>

          {/* Action */}
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              {t("actionHeader")}
            </p>
            <p className="text-sm text-white leading-relaxed font-medium">{t(`result.${result}.action`)}</p>
          </div>

          {/* Share buttons */}
          <ShareButtons stateLabel={stateLabel} stateEmoji={style.emoji} />

          {/* Divider + CTA */}
          <div className="space-y-4 pt-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-xs text-zinc-500 bg-background">
                  {t("followupDivider")}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{t("followupTitle")}</p>
                <ul className="space-y-1.5">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex items-start gap-2 text-xs text-zinc-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      {t(`followupBullet${n}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/signup"
                className={`${COMPONENTS.buttonPrimary} inline-flex items-center justify-center gap-2 w-full py-3 text-sm`}
              >
                {t("followupCta")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Retake */}
          <div className="text-center">
            <button
              onClick={() => {
                setAnswers(Array(QUESTIONS.length).fill(null));
                setCurrentQ(0);
                setEmail("");
                setEmailStatus("idle");
                setResult(null);
                setScreen("intro");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2"
            >
              {t("retake")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
