"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// Life years reference kept for SEO text (~79 years at 72 bpm)

// ─── Presets: everyday moments measured in heartbeats ────────────────────────

type Preset = {
  label: string;
  icon: typeof Heart;
  beats: number;
  description: string;
};

const PRESETS: Preset[] = [
  {
    label: "Un abrazo largo",
    icon: Heart,
    beats: Math.round(AVG_BPM * 0.33), // ~20 seconds
    description: "20 segundos de contacto real",
  },
  {
    label: "Una canción favorita",
    icon: Sparkles,
    beats: Math.round(AVG_BPM * 3.5), // 3.5 min
    description: "3 minutos y medio de pausa",
  },
  {
    label: "Una buena conversación",
    icon: Clock,
    beats: BEATS_PER_HOUR, // 1 hour
    description: "1 hora que puede cambiar tu día",
  },
  {
    label: "Una noche de sueño",
    icon: Clock,
    beats: Math.round(55 * 60 * 8), // 8h at lower resting ~55 bpm
    description: "8 horas restaurando tu cuerpo",
  },
  {
    label: "Un año de tu vida",
    icon: Calendar,
    beats: Math.round(BEATS_PER_YEAR),
    description: `${Math.round(BEATS_PER_YEAR / 1_000_000)}M de latidos invertidos`,
  },
  {
    label: "Desde que naciste",
    icon: Baby,
    beats: 0, // calculated from age
    description: "Cada uno cuenta",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBeats(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} mil millones`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-ES");
}

function beatsToTime(beats: number): string {
  const totalMinutes = beats / AVG_BPM;
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  const hours = totalMinutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} horas`;
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)} días`;
  const years = days / 365.25;
  return `${years.toFixed(1)} años`;
}

function percentOfLife(beats: number): number {
  return Math.min(100, (beats / THREE_BILLION) * 100);
}

// ─── Animated counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
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
      // ease-out cubic
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

  return <>{formatBeats(display)}</>;
}

// ─── Live heartbeat counter ──────────────────────────────────────────────────

function LiveCounter({ baseBeats }: { baseBeats: number }) {
  const [extra, setExtra] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setExtra(0);
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      setExtra(Math.round(elapsed * (AVG_BPM / 60)));
    }, 830); // slightly irregular like a real heartbeat
    return () => clearInterval(id);
  }, [baseBeats]);

  return (
    <span className="tabular-nums">{formatBeats(baseBeats + extra)}</span>
  );
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
  const sfx = useSfx();

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
  // remaining / pct removed — positive framing only

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
          <p className={`${TYPOGRAPHY.label} text-fuchsia-400`}>Herramienta gratuita</p>
          <h1 className={`${TYPOGRAPHY.h2} md:text-5xl bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent`}>
            Calculadora de Latidos
          </h1>
          <p className={`${TYPOGRAPHY.body} text-zinc-400 max-w-2xl mx-auto`}>
            Tu corazón late unas {AVG_BPM} veces por minuto. En toda una vida, son cerca de{" "}
            <span className="text-fuchsia-300 font-semibold">3 mil millones de latidos</span>.
            Descubre cuántos llevas y cuántos te quedan.
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
                Mi edad
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
                Tiempo personalizado
              </button>
            </div>

            {/* Input */}
            {mode === "age" ? (
              <div className="space-y-3">
                <label className="text-sm text-zinc-400">Fecha de nacimiento</label>
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
                <label className="text-sm text-zinc-400">Cantidad de tiempo</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={customValue}
                    onChange={(e) => { setCustomValue(e.target.value); setCalculated(false); }}
                    placeholder="Ej: 2"
                    className={`${COMPONENTS.inputField} flex-1`}
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => { setCustomUnit(e.target.value as typeof customUnit); setCalculated(false); }}
                    className={`${COMPONENTS.inputField} w-32`}
                  >
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Días</option>
                    <option value="years">Años</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={customBeats <= 0}
                  className={`${COMPONENTS.buttonPrimary} w-full mt-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Calcular latidos
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
                  {mode === "age" ? "Latidos que te han traido hasta aqui" : "Latidos en ese tiempo"}
                </p>
                <p className="text-4xl md:text-5xl font-bold bg-linear-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  {mode === "age" ? (
                    <LiveCounter baseBeats={ageBeats} />
                  ) : (
                    <AnimatedNumber value={customBeats} />
                  )}
                </p>
                {mode === "age" && (
                  <p className="mt-2 text-sm text-zinc-400">
                    Cada uno de ellos te sostuvo para llegar a este momento.
                  </p>
                )}
              </div>
            </div>

            {/* Positive reframe — what you've built */}
            {mode === "age" && (
              <div className={COMPONENTS.card}>
                <p className="text-sm font-semibold text-white mb-3">Lo que representan tus latidos</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-violet-300">
                      {Math.round(currentBeats / BEATS_PER_DAY).toLocaleString("es-ES")}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">amaneceres vividos</p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-fuchsia-300">
                      {Math.round(currentBeats / (AVG_BPM * 3.5)).toLocaleString("es-ES")}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">canciones que cabrian</p>
                  </div>
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-300">
                      {Math.round(currentBeats / BEATS_PER_HOUR).toLocaleString("es-ES")}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">horas de experiencia</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-300">
                      {Math.round(currentBeats / (AVG_BPM * 0.33)).toLocaleString("es-ES")}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">abrazos posibles</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-zinc-600 text-center">
                  Tu corazon late {AVG_BPM} veces por minuto sin que se lo pidas. Esa constancia ya la tienes dentro.
                </p>
              </div>
            )}

            {/* Perspective: everyday moments */}
            <div className={COMPONENTS.card}>
              <p className="text-sm font-semibold text-zinc-300 mb-4">
                {mode === "age"
                  ? "Tus latidos en perspectiva"
                  : `${formatBeats(customBeats)} latidos equivalen a...`}
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
                      key={preset.label}
                      className="rounded-xl border border-zinc-800 bg-black/20 p-3 space-y-1.5 hover:border-fuchsia-500/30 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-fuchsia-400/70" />
                      <p className="text-xs font-semibold text-zinc-300">{preset.label}</p>
                      <p className="text-lg font-bold text-white">{formatBeats(beats)}</p>
                      <p className="text-[11px] text-zinc-600">
                        {ratio && ratio > 1
                          ? `x${ratio.toLocaleString("es-ES")} veces en tu vida`
                          : preset.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email capture */}
            {!emailSent ? (
              <div className={COMPONENTS.card}>
                <p className="text-sm font-semibold text-zinc-300">
                  Recibe tu informe de latidos por email
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Tu calculo, perspectiva y un primer paso de accion personalizado.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    value={captureEmail}
                    onChange={(e) => setCaptureEmail(e.target.value)}
                    placeholder="tu@email.com"
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
                    {emailSending ? "..." : "Enviar"}
                  </button>
                </div>
                <div className="mt-3">
                  <PrivacyCheckbox
                    checked={emailConsent}
                    onChange={setEmailConsent}
                    context="Tu email se usara solo para enviar este informe."
                  />
                </div>
              </div>
            ) : (
              <div className={COMPONENTS.card}>
                <p className="text-sm text-emerald-400 font-medium text-center">
                  Enviado — revisa tu bandeja de entrada
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6 text-center space-y-4">
              <p className="text-lg font-bold text-white">
                Tu corazon ya hace su parte. Ahora te toca a ti.
              </p>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Con la misma constancia con la que late tu corazon, puedes avanzar un paso cada dia.
                Tres Mil Millones de Latidos te ayuda a convertir la intencion en accion.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/app" className={COMPONENTS.buttonPrimary}>
                  Empezar ahora <ArrowRight className="w-4 h-4 ml-2 inline" />
                </Link>
                <Link href="/test" className={COMPONENTS.buttonSecondary}>
                  Hacer el test gratuito
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* SEO content below the fold */}
        <div className="mt-16 max-w-3xl mx-auto space-y-8 text-zinc-500">
          <div className={COMPONENTS.divider} />
          <div className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h4} text-zinc-300`}>
              Por que contar latidos
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm leading-relaxed">
              <div className="space-y-2">
                <p>
                  Tu corazon late unas <strong className="text-zinc-300">{AVG_BPM} veces por minuto</strong> sin
                  que se lo pidas. Son {BEATS_PER_HOUR.toLocaleString("es-ES")} por hora,{" "}
                  {BEATS_PER_DAY.toLocaleString("es-ES")} al dia. Cada uno sostiene todo lo que haces,
                  piensas y sientes.
                </p>
                <p>
                  A lo largo de una vida, el corazon late cerca de{" "}
                  <strong className="text-fuchsia-300">3 mil millones de veces</strong>.
                  No es una cuenta atras — es un recordatorio de lo que ya has construido latido a latido.
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  Esta calculadora usa la frecuencia cardiaca en reposo promedio de un adulto sano.
                  Tu frecuencia real varia con la edad, el ejercicio y la genetica.
                </p>
                <p>
                  El objetivo no es la precision clinica: es la <strong className="text-zinc-300">perspectiva</strong>.
                  Darte cuenta de que ya cargas con millones de latidos de experiencia
                  puede ser el empujon que necesitas para dar el siguiente paso.
                </p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-white">¿Y ahora que?</p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Saber cuantos latidos quedan no cambia nada. Lo que cambia es decidir que haces con el siguiente.
                  Tres Mil Millones de Latidos te ayuda a dar ese paso.
                </p>
                <a href="/app" className="inline-flex items-center gap-2 mt-1 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                  Empezar ahora →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
