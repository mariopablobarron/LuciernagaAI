"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Link2 } from "lucide-react";
import { COMPONENTS } from "@/styles/design-system";

type EmotionalState = "bloqueo" | "ansiedad" | "duda" | "claridad" | "neutral";

type Option = {
  label: string;
  scores: Partial<Record<EmotionalState, number>>;
};

type Question = {
  id: number;
  text: string;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "¿Cómo describirías tu energía mental ahora mismo?",
    options: [
      { label: "Estancada — no consigo avanzar", scores: { bloqueo: 3 } },
      { label: "Acelerada — demasiados pensamientos a la vez", scores: { ansiedad: 3 } },
      { label: "Difusa — no sé lo que quiero", scores: { duda: 3 } },
      { label: "Fluida — sé lo que toca hacer", scores: { claridad: 3 } },
    ],
  },
  {
    id: 2,
    text: "Cuando piensas en tu objetivo principal, ¿qué ocurre?",
    options: [
      { label: "Me paralizo antes de empezar", scores: { bloqueo: 3 } },
      { label: "Me angustio pensando en lo que puede fallar", scores: { ansiedad: 3 } },
      { label: "No sé por dónde empezar", scores: { duda: 3 } },
      { label: "Tengo claro el siguiente paso", scores: { claridad: 3 } },
    ],
  },
  {
    id: 3,
    text: "¿Cuánto llevas dando vueltas al mismo tema sin avanzar?",
    options: [
      { label: "Días o semanas — sigo en el mismo punto", scores: { bloqueo: 3, duda: 1 } },
      { label: "Horas, con presión que no para", scores: { ansiedad: 3 } },
      { label: "Poco tiempo, pero no encuentro la dirección", scores: { duda: 3 } },
      { label: "Estoy avanzando, aunque lento", scores: { claridad: 2, neutral: 1 } },
    ],
  },
  {
    id: 4,
    text: "¿Qué sientes en el cuerpo mientras respondes esto?",
    options: [
      { label: "Tensión o pesadez", scores: { bloqueo: 3 } },
      { label: "Inquietud o palpitaciones", scores: { ansiedad: 3 } },
      { label: "Niebla mental, confusión", scores: { duda: 3 } },
      { label: "Calma o presencia", scores: { claridad: 3 } },
    ],
  },
  {
    id: 5,
    text: "Si pudieras pedir una sola cosa ahora, ¿cuál sería?",
    options: [
      { label: "Que alguien me desatasque", scores: { bloqueo: 3 } },
      { label: "Silenciar el ruido en mi cabeza", scores: { ansiedad: 3 } },
      { label: "Alguien que me ayude a ordenar mis ideas", scores: { duda: 3 } },
      { label: "Mantener el impulso que ya tengo", scores: { claridad: 3 } },
    ],
  },
];

type StateResult = {
  label: string;
  emoji: string;
  tagline: string;
  pattern: string;
  signal: string;
  action: string;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
};

const STATE_RESULTS: Record<EmotionalState, StateResult> = {
  bloqueo: {
    label: "Bloqueo mental",
    emoji: "🧱",
    tagline: "Sabes lo que tienes que hacer — pero no puedes empezar.",
    pattern:
      "Tu mente actúa como si el primer paso fuera irreversible. No lo es. El bloqueo no es falta de voluntad: es un mecanismo de protección que se ha vuelto excesivo y que se activa antes de que hagas nada.",
    signal:
      "La tarea percibida como «enorme» se desactiva sola en cuanto la reduces a 10 minutos reales. No necesitas un plan completo.",
    action:
      "Abre ahora el documento, archivo o herramienta del proyecto. Solo abrirlo, sin hacer nada más. En los próximos 2 minutos.",
    accentColor: "text-orange-400",
    borderColor: "border-orange-500/40",
    badgeBg: "bg-orange-500/15",
  },
  ansiedad: {
    label: "Ansiedad de acción",
    emoji: "⚡",
    tagline: "Tienes energía — pero se convierte en presión, no en avance.",
    pattern:
      "Tu cabeza genera escenarios de fallo antes de que empieces. Cada vez que preparas más en lugar de actuar, la ansiedad crece. Más información no resuelve esto — lo amplifica.",
    signal:
      "La ansiedad baja al primer resultado concreto pequeño, no al primer plan perfecto. Actuar 5 minutos vale más que planificar 2 horas.",
    action:
      "Escribe en papel (o en un documento): «¿Qué es lo peor concreto que puede pasar?» Una frase. Sin adornos. Nómbralo.",
    accentColor: "text-yellow-400",
    borderColor: "border-yellow-500/40",
    badgeBg: "bg-yellow-500/15",
  },
  duda: {
    label: "Niebla de dirección",
    emoji: "🌫️",
    tagline: "Tienes ganas — pero no sabes hacia dónde.",
    pattern:
      "La duda crónica no es falta de información: es un exceso de opciones sin un criterio de decisión claro. Buscar más datos no resuelve esto — añade más variables a un sistema ya saturado.",
    signal:
      "Necesitas decidir algo pequeño, no todo a la vez. Una sola decisión concreta rompe la niebla mejor que cualquier análisis.",
    action:
      "Responde en 30 segundos: ¿Cuál es el UN objetivo que, si avanzara esta semana, sentiría que hay progreso real? Escríbelo ahora.",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/40",
    badgeBg: "bg-blue-500/15",
  },
  claridad: {
    label: "Momento de claridad",
    emoji: "✨",
    tagline: "Sabes lo que quieres y tienes energía para avanzar.",
    pattern:
      "Estás en un estado de flujo potencial. El riesgo ahora no es la parálisis — es la dispersión. Hacer demasiado y perder el foco es lo que convierte la claridad en caos.",
    signal:
      "La claridad es una ventana, no una posición permanente. Aprovéchala ahora, no mañana.",
    action:
      "Define en una frase el resultado concreto de hoy. No la lista entera: solo la cosa más importante que, si la haces, el día habrá valido.",
    accentColor: "text-indigo-400",
    borderColor: "border-indigo-500/40",
    badgeBg: "bg-indigo-500/15",
  },
  neutral: {
    label: "Estado neutro",
    emoji: "🔵",
    tagline: "Estás en punto muerto — ni bloqueado ni en impulso claro.",
    pattern:
      "El estado neutro puede ser recuperación necesaria o el inicio silencioso de un bloqueo. La diferencia está en si tienes un próximo paso definido o no.",
    signal:
      "No necesitas motivación — necesitas un ancla pequeña a la que volver. Un compromiso concreto de 20 minutos es suficiente.",
    action:
      "Elige una tarea de menos de 20 minutos que lleves postergando. Ponla en tu agenda de hoy con hora exacta.",
    accentColor: "text-zinc-400",
    borderColor: "border-zinc-500/40",
    badgeBg: "bg-zinc-500/15",
  },
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
    const option = QUESTIONS[qi]?.options[selectedIdx];
    if (!option) return;
    Object.entries(option.scores).forEach(([state, score]) => {
      scores[state as EmotionalState] += score;
    });
  });

  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as EmotionalState;
}

function ShareButtons({ stateLabel, stateEmoji }: { stateLabel: string; stateEmoji: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `${stateEmoji} Acabo de descubrir que estoy en estado de "${stateLabel}". ¿Y tú?`;
  const shareUrl = `${window.location.origin}/test`;
  const fullText = `${shareText} Test gratuito de diagnóstico mental: ${shareUrl}`;

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
        Comparte tu resultado
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
          title="Copiar link"
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
  const [screen, setScreen] = useState<Screen>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
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
          .catch(() => {});
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
        if (res.ok && result) {
          fetch("/api/quiz/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim(), state: result }),
          }).catch(() => {});
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
              Diagnóstico gratuito
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              ¿Qué te está{" "}
              <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                frenando ahora?
              </span>
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed">
              5 preguntas. Resultado inmediato. Una acción concreta para hoy.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 py-2">
            {[
              { emoji: "🧱", label: "Bloqueo" },
              { emoji: "⚡", label: "Ansiedad" },
              { emoji: "🌫️", label: "Niebla" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center space-y-2"
              >
                <div className="text-2xl">{s.emoji}</div>
                <div className="text-xs text-zinc-400 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setScreen("quiz")}
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center justify-center gap-2 px-8 py-4 text-base w-full sm:w-auto`}
          >
            Empezar diagnóstico <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-xs text-zinc-500">
            Anónimo · Sin registro · 2 minutos
          </p>
        </div>
      </div>
    );
  }

  if (screen === "quiz") {
    const question = QUESTIONS[currentQ];
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Pregunta {currentQ + 1} de {QUESTIONS.length}</span>
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
              {question.text}
            </h2>

            <div className="space-y-3">
              {question.options.map((option, idx) => (
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
                    <span className="text-sm leading-relaxed">{option.label}</span>
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
              ← Atrás
            </button>
            {currentAnswer !== null && (
              <p className="text-xs text-zinc-600 animate-pulse">Continuando…</p>
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
            <h2 className="text-2xl font-bold">¿Te enviamos el diagnóstico?</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Recibe tu resultado completo por email y Tres Mil Millones de Latidos te ayudará a hacer seguimiento de tu estado.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={COMPONENTS.inputField}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim()) void handleEmailSubmit(false);
              }}
            />
            <button
              onClick={() => void handleEmailSubmit(false)}
              disabled={!email.trim() || emailStatus === "sending"}
              className={`${COMPONENTS.buttonPrimary} w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {emailStatus === "sending" ? "Enviando…" : "Ver resultado →"}
            </button>
          </div>

          <button
            onClick={() => void handleEmailSubmit(true)}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-3 min-h-11 block w-full"
          >
            Continuar sin email
          </button>
        </div>
      </div>
    );
  }

  // Result screen
  if (screen === "result" && result) {
    const stateData = STATE_RESULTS[result];
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full space-y-8">
          {/* Header result */}
          <div className="text-center space-y-4">
            <div className="text-5xl">{stateData.emoji}</div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${stateData.badgeBg} ${stateData.borderColor}`}>
              <span className={`text-sm font-semibold ${stateData.accentColor}`}>
                {stateData.label}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold leading-snug">
              {stateData.tagline}
            </h2>
          </div>

          {/* Progress comparison — only shown if user has a previous result */}
          {previousState && previousState !== result && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                Tu evolución
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
                  <div className="text-xl mb-1">{STATE_RESULTS[previousState].emoji}</div>
                  <div className="text-xs text-zinc-400 font-medium">{STATE_RESULTS[previousState].label}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">antes</div>
                </div>
                <div className="text-zinc-600 text-lg">→</div>
                <div className={`flex-1 text-center px-3 py-2.5 rounded-lg border ${stateData.badgeBg} ${stateData.borderColor}`}>
                  <div className="text-xl mb-1">{stateData.emoji}</div>
                  <div className={`text-xs font-semibold ${stateData.accentColor}`}>{stateData.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">ahora</div>
                </div>
              </div>
              {(previousState === "bloqueo" || previousState === "ansiedad") &&
                (result === "claridad" || result === "duda") && (
                  <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                    Eso no pasa solo. Has trabajado en esto.
                  </p>
                )}
              {result === "bloqueo" || result === "ansiedad" ? (
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  Esta semana es más difícil que la última. Es información, no fracaso.
                </p>
              ) : null}
            </div>
          )}

          {/* Pattern */}
          <div className={`rounded-xl border ${stateData.borderColor} ${stateData.badgeBg} p-5 space-y-2`}>
            <p className={`text-xs font-semibold uppercase tracking-widest ${stateData.accentColor}`}>
              Lo que está pasando
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{stateData.pattern}</p>
          </div>

          {/* Signal */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              La señal clave
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{stateData.signal}</p>
          </div>

          {/* Action */}
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              Tu acción para ahora
            </p>
            <p className="text-sm text-white leading-relaxed font-medium">{stateData.action}</p>
          </div>

          {/* Share buttons */}
          <ShareButtons stateLabel={stateData.label} stateEmoji={stateData.emoji} />

          {/* Divider + CTA */}
          <div className="space-y-4 pt-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-xs text-zinc-500 bg-background">
                  Para seguimiento continuo
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">
                  Tres Mil Millones de Latidos detecta tu estado en cada sesión
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Conversaciones orientadas a acción, no a charla",
                    "Seguimiento de objetivos y bloqueos entre sesiones",
                    "Señales de riesgo antes de que escalen",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-zinc-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/signup"
                className={`${COMPONENTS.buttonPrimary} inline-flex items-center justify-center gap-2 w-full py-3 text-sm`}
              >
                Empezar gratis <ArrowRight className="w-4 h-4" />
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
              Repetir el test
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
