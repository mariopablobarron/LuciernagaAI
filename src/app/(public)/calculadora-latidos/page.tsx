"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Heart, Clock, Calendar, Baby, Sparkles } from "lucide-react";
import { COMPONENTS, GRADIENTS, TYPOGRAPHY, LAYOUTS } from "@/styles/design-system";
import { trackEvent } from "@/lib/analytics";
import { useSfx } from "@/lib/useSfx";
import PrivacyCheckbox from "@/components/PrivacyCheckbox";

// ─── Constants ───────────────────────────────────────────────────────────────

const AVG_BPM = 72; // resting heart rate average adult
const BEATS_PER_MIN = AVG_BPM;
const BEATS_PER_HOUR = BEATS_PER_MIN * 60;
const BEATS_PER_DAY = BEATS_PER_HOUR * 24;
const BEATS_PER_YEAR = BEATS_PER_DAY * 365.25;
const THREE_BILLION = 3_000_000_000;

// Map locale → BCP47 number-format locale.
const LOCALE_MAP: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
};

// ─── Presets: everyday moments measured in heartbeats ────────────────────────
// Estructura visual fija. Copy desde messages.calculator.preset.<id>.{label,description}.
const PRESETS = [
  { id: "hug", icon: Heart, beats: Math.round(AVG_BPM * 0.33) },
  { id: "song", icon: Sparkles, beats: Math.round(AVG_BPM * 3.5) },
  { id: "talk", icon: Clock, beats: BEATS_PER_HOUR },
  { id: "sleep", icon: Clock, beats: Math.round(55 * 60 * 8) },
  { id: "year", icon: Calendar, beats: Math.round(BEATS_PER_YEAR) },
  { id: "birth", icon: Baby, beats: 0 }, // calculated from age
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Locale-aware number formatter — "1.5K" / "2.3M" / "3.00 bn" según idioma.
function makeFormatter(locale: string, t: (k: string, vals?: Record<string, string | number>) => string) {
  const bcp = LOCALE_MAP[locale] ?? "en-US";
  return (n: number): string => {
    if (n >= 1_000_000_000) {
      return t("format.billion", { n: (n / 1_000_000_000).toFixed(2) });
    }
    if (n >= 1_000_000) {
      return t("format.million", { n: (n / 1_000_000).toFixed(1) });
    }
    if (n >= 1_000) {
      return t("format.thousand", { n: (n / 1_000).toFixed(1) });
    }
    return n.toLocaleString(bcp);
  };
}

// ─── Animated counter ────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  duration = 1200,
  format,
}: {
  value: number;
  duration?: number;
  format: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{format(display)}</>;
}

// ─── Live heartbeat counter ──────────────────────────────────────────────────

function LiveCounter({
  baseBeats,
  format,
}: {
  baseBeats: number;
  format: (n: number) => string;
}) {
  const [extra, setExtra] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExtra(0);
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      setExtra(Math.round(elapsed * (AVG_BPM / 60)));
    }, 830);
    return () => clearInterval(id);
  }, [baseBeats]);

  return <span className="tabular-nums">{format(baseBeats + extra)}</span>;
}

// ─── Heartbeat pulse animation ───────────────────────────────────────────────

function PulsingHeart({ active }: { active: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${active ? "animate-pulse" : ""}`}>
      <Heart
        className={`w-8 h-8 transition-colors duration-300 ${
          active ? "text-fuchsia-400 fill-fuchsia-400/30" : "text-zinc-600"
        }`}
      />
      {active && (
        <span className="absolute inset-0 rounded-full bg-fuchsia-500/20 animate-ping" />
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CalculadoraLatidosPage() {
  const t = useTranslations("calculator");
  const locale = useLocale();
  const sfx = useSfx();

  const bcp = LOCALE_MAP[locale] ?? "en-US";
  const formatBeats = useMemo(() => makeFormatter(locale, t), [locale, t]);
  const localeNum = useCallback((n: number) => n.toLocaleString(bcp), [bcp]);

  // Mode: "age" or "custom"
  const [mode, setMode] = useState<"age" | "custom">("age");

  // Age calculator
  const [birthDate, setBirthDate] = useState("");

  // Custom calculator
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days" | "years">("hours");

  // Results
  const [calculated, setCalculated] = useState(false);

  // Email capture
  const [captureEmail, setCaptureEmail] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const ageBeats = useMemo(() => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    if (diffMs <= 0) return 0;
    const diffMinutes = diffMs / 1000 / 60;
    return Math.round(diffMinutes * AVG_BPM);
  }, [birthDate]);

  const customBeats = useMemo(() => {
    const v = parseFloat(customValue);
    if (isNaN(v) || v <= 0) return 0;
    switch (customUnit) {
      case "minutes": return Math.round(v * BEATS_PER_MIN);
      case "hours": return Math.round(v * BEATS_PER_HOUR);
      case "days": return Math.round(v * BEATS_PER_DAY);
      case "years": return Math.round(v * BEATS_PER_YEAR);
    }
  }, [customValue, customUnit]);

  const currentBeats = mode === "age" ? ageBeats : customBeats;

  const handleCalculate = useCallback(() => {
    if (currentBeats <= 0) return;
    setCalculated(true);
    sfx.play("heartbeat");
    trackEvent("heartbeat_calculator_used", { mode, beats: currentBeats });
  }, [currentBeats, mode, sfx]);

  // Auto-calculate when birth date changes
  useEffect(() => {
    if (mode === "age" && birthDate && ageBeats > 0) {
      setCalculated(true);
      sfx.play("heartbeat");
      trackEvent("heartbeat_calculator_used", { mode: "age", beats: ageBeats });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate]);

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background}`}>
      <div className={`${LAYOUTS.sectionInner} py-12 md:py-20`}>
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <p className={`${TYPOGRAPHY.label} text-fuchsia-400`}>{t("eyebrow")}</p>
          <h1 className={`${TYPOGRAPHY.h2} md:text-5xl bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent`}>
            {t("title")}
          </h1>
          <p className={`${TYPOGRAPHY.body} text-zinc-400 max-w-2xl mx-auto`}>
            {t("introPre", { bpm: AVG_BPM })}{" "}
            <span className="text-fuchsia-300 font-semibold">{t("introHighlight")}</span>{" "}
            {t("introPost")}
          </p>
        </div>

        {/* Calculator */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className={COMPONENTS.card}>
            {/* Mode selector */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => { setMode("age"); setCalculated(false); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === "age"
                    ? "bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-300"
                    : "border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {t("modeAge")}
              </button>
              <button
                type="button"
                onClick={() => { setMode("custom"); setCalculated(false); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === "custom"
                    ? "bg-violet-500/15 border border-violet-500/40 text-violet-300"
                    : "border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {t("modeCustom")}
              </button>
            </div>

            {/* Input */}
            {mode === "age" ? (
              <div className="space-y-3">
                <label className="text-sm text-zinc-400">{t("birthDateLabel")}</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className={COMPONENTS.inputField}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm text-zinc-400">{t("amountLabel")}</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={customValue}
                    onChange={(e) => { setCustomValue(e.target.value); setCalculated(false); }}
                    placeholder={t("amountPlaceholder")}
                    className={`${COMPONENTS.inputField} flex-1`}
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => { setCustomUnit(e.target.value as typeof customUnit); setCalculated(false); }}
                    className={`${COMPONENTS.inputField} w-32`}
                  >
                    <option value="minutes">{t("unitMinutes")}</option>
                    <option value="hours">{t("unitHours")}</option>
                    <option value="days">{t("unitDays")}</option>
                    <option value="years">{t("unitYears")}</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={customBeats <= 0}
                  className={`${COMPONENTS.buttonPrimary} w-full mt-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {t("calculateButton")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {calculated && currentBeats > 0 && (
          <div className="mt-10 max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main number — celebratory */}
            <div className="text-center space-y-3">
              <PulsingHeart active />
              <div>
                <p className="text-sm text-zinc-500 mb-1">
                  {mode === "age" ? t("resultLabelAge") : t("resultLabelCustom")}
                </p>
                <p className="text-4xl md:text-5xl font-bold bg-linear-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  {mode === "age" ? (
                    <LiveCounter baseBeats={ageBeats} format={formatBeats} />
                  ) : (
                    <AnimatedNumber value={customBeats} format={formatBeats} />
                  )}
                </p>
                {mode === "age" && (
                  <p className="mt-2 text-sm text-zinc-400">{t("resultCaptionAge")}</p>
                )}
              </div>
            </div>

            {/* Positive reframe — what you've built */}
            {mode === "age" && (
              <div className={COMPONENTS.card}>
                <p className="text-sm font-semibold text-white mb-3">{t("reframeTitle")}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-violet-300">
                      {localeNum(Math.round(currentBeats / BEATS_PER_DAY))}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{t("reframeSunrises")}</p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-fuchsia-300">
                      {localeNum(Math.round(currentBeats / (AVG_BPM * 3.5)))}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{t("reframeSongs")}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-300">
                      {localeNum(Math.round(currentBeats / BEATS_PER_HOUR))}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{t("reframeHours")}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-300">
                      {localeNum(Math.round(currentBeats / (AVG_BPM * 0.33)))}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{t("reframeHugs")}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-zinc-600 text-center">
                  {t("reframeFooter", { bpm: AVG_BPM })}
                </p>
              </div>
            )}

            {/* Perspective: everyday moments */}
            <div className={COMPONENTS.card}>
              <p className="text-sm font-semibold text-zinc-300 mb-4">
                {mode === "age"
                  ? t("perspectiveTitleAge")
                  : t("perspectiveTitleCustom", { beats: formatBeats(customBeats) })}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESETS.map((preset) => {
                  const beats = preset.beats === 0 ? currentBeats : preset.beats;
                  const ratio = mode === "age" && preset.beats > 0
                    ? Math.round(currentBeats / preset.beats)
                    : null;
                  const Icon = preset.icon;
                  return (
                    <div
                      key={preset.id}
                      className="rounded-xl border border-zinc-800 bg-black/20 p-3 space-y-1.5 hover:border-fuchsia-500/30 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-fuchsia-400/70" />
                      <p className="text-xs font-semibold text-zinc-300">
                        {t(`preset.${preset.id}.label`)}
                      </p>
                      <p className="text-lg font-bold text-white">{formatBeats(beats)}</p>
                      <p className="text-[11px] text-zinc-600">
                        {ratio && ratio > 1
                          ? t("perspectiveRatio", { n: localeNum(ratio) })
                          : t(`preset.${preset.id}.description`)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email capture */}
            {!emailSent ? (
              <div className={COMPONENTS.card}>
                <p className="text-sm font-semibold text-zinc-300">{t("emailTitle")}</p>
                <p className="mt-1 text-xs text-zinc-500">{t("emailDesc")}</p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    value={captureEmail}
                    onChange={(e) => setCaptureEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className={`${COMPONENTS.inputField} flex-1`}
                  />
                  <button
                    type="button"
                    disabled={emailSending || !captureEmail.includes("@") || !emailConsent}
                    onClick={async () => {
                      setEmailSending(true);
                      try {
                        await fetch("/api/calculator/email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email: captureEmail.trim(),
                            beats: currentBeats,
                          }),
                        });
                        setEmailSent(true);
                        trackEvent("calculator_email_captured");
                      } catch { /* silent */ }
                      finally { setEmailSending(false); }
                    }}
                    className={`${COMPONENTS.buttonPrimary} shrink-0 disabled:opacity-40`}
                  >
                    {emailSending ? "..." : t("emailSend")}
                  </button>
                </div>
                <div className="mt-3">
                  <PrivacyCheckbox
                    checked={emailConsent}
                    onChange={setEmailConsent}
                    context={t("emailConsent")}
                  />
                </div>
              </div>
            ) : (
              <div className={COMPONENTS.card}>
                <p className="text-sm text-emerald-400 font-medium text-center">
                  {t("emailSent")}
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6 text-center space-y-4">
              <p className="text-lg font-bold text-white">{t("ctaTitle")}</p>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">{t("ctaDesc")}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/app" className={COMPONENTS.buttonPrimary}>
                  {t("ctaPrimary")} <ArrowRight className="w-4 h-4 ml-2 inline" />
                </Link>
                <Link href="/test" className={COMPONENTS.buttonSecondary}>
                  {t("ctaSecondary")}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* SEO content below the fold */}
        <div className="mt-16 max-w-3xl mx-auto space-y-8 text-zinc-500">
          <div className={COMPONENTS.divider} />
          <div className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h4} text-zinc-300`}>{t("seoTitle")}</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm leading-relaxed">
              <div className="space-y-2">
                <p>
                  {t("seo1aPre")}{" "}
                  <strong className="text-zinc-300">{t("seo1aBpm", { bpm: AVG_BPM })}</strong>{" "}
                  {t("seo1aPost", {
                    perHour: localeNum(BEATS_PER_HOUR),
                    perDay: localeNum(BEATS_PER_DAY),
                  })}
                </p>
                <p>
                  {t("seo1bPre")}{" "}
                  <strong className="text-fuchsia-300">{t("seo1bStrong")}</strong>.{" "}
                  {t("seo1bPost")}
                </p>
              </div>
              <div className="space-y-2">
                <p>{t("seo2a")}</p>
                <p>
                  {t("seo2bPre")}{" "}
                  <strong className="text-zinc-300">{t("seo2bStrong")}</strong>.{" "}
                  {t("seo2bPost")}
                </p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-white">{t("nowWhatTitle")}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{t("nowWhatDesc")}</p>
                <Link href="/app" className="inline-flex items-center gap-2 mt-1 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                  {t("nowWhatCta")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
