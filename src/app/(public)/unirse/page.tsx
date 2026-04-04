"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Lock, Sparkles } from "lucide-react";
import { COMPONENTS } from "@/styles/design-system";

const MISSIONS = [
  {
    number: 1,
    label: "Misión 1 de 3",
    question: "¿Cuál es el cambio que más necesitas hacer en tu vida ahora mismo?",
    hint: "Sé específico/a. No lo que 'deberías' cambiar — lo que realmente necesitas.",
    placeholder: "Ej: Dejar de procrastinar en mi proyecto, mejorar mis relaciones, recuperar energía...",
  },
  {
    number: 2,
    label: "Misión 2 de 3",
    question: "¿Qué has intentado antes para conseguirlo y no funcionó?",
    hint: "Cuéntanos lo que ya sabes que no sirve. Eso nos ayuda a no repetirlo.",
    placeholder: "Ej: Apps de productividad, promesas a mí mismo, cursos que no terminé...",
  },
  {
    number: 3,
    label: "Misión 3 de 3",
    question: "¿Qué pasaría si dentro de 30 días nada hubiera cambiado?",
    hint: "Siente el peso real de no actuar. Esta pregunta es el motor.",
    placeholder: "Ej: Seguiría igual de paralizado, perdería la oportunidad, me sentiría...",
  },
];

function UnirseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteCode = searchParams.get("invite") ?? undefined;

  const [step, setStep] = useState<0 | 1 | 2 | 3 | "done">(0);
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState(["", "", ""]);
  const [current, setCurrent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill email if stored from invite page
  useEffect(() => {
    const stored = localStorage.getItem("luc_invite_email");
    if (stored) setEmail(stored);
  }, []);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setStep(1);
  }

  function handleMissionNext() {
    if (current.trim().length < 10) {
      setError("Escribe al menos una frase completa.");
      return;
    }
    setError("");
    const idx = (step as number) - 1;
    const newAnswers = [...answers];
    newAnswers[idx] = current;
    setAnswers(newAnswers);
    setCurrent("");

    if (step === 3) {
      void submitWaitlist(newAnswers);
    } else {
      setStep((step as number) + 1 as 1 | 2 | 3);
    }
  }

  async function submitWaitlist(finalAnswers: string[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          mission1: finalAnswers[0],
          mission2: finalAnswers[1],
          mission3: finalAnswers[2],
          inviteCode,
        }),
      });

      if (!res.ok) throw new Error("Error al enviar");
      const lEmail = email.toLowerCase().trim();
      localStorage.setItem("luc_waitlist_email", lEmail);
      localStorage.setItem(
        "luc_waitlist_context",
        JSON.stringify({ m1: finalAnswers[0], m2: finalAnswers[1], m3: finalAnswers[2] })
      );
      setStep("done");
    } catch {
      setError("Algo falló. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const missionIndex = typeof step === "number" && step > 0 ? step - 1 : 0;
  const mission = MISSIONS[missionIndex];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Progress bar */}
      {step !== "done" && (
        <div className="w-full max-w-lg mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-widest">
              {step === 0 ? "Acceso beta" : `Misión ${step} de 3`}
            </span>
            <span className="text-xs text-zinc-600">
              {step === 0 ? "0" : Math.round(((step as number) / 3) * 100)}%
            </span>
          </div>
          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-500"
              style={{ width: step === 0 ? "4%" : `${((step as number) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 0: Email entry */}
      {step === 0 && (
        <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {inviteCode && (
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              <span className="text-sm text-fuchsia-300 font-medium">Has sido invitado/a. Acceso garantizado.</span>
            </div>
          )}
          <div className="text-center space-y-3">
            <div className="text-5xl mb-2">🌟</div>
            <h1 className="text-3xl md:text-4xl font-bold">Acceso a Luciérnaga</h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              No hay formulario de registro. Hay tres preguntas que nadie más se atreve a hacerte.
              Respóndelas y el acceso es tuyo.
            </p>
          </div>

          {/* What to expect */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            {MISSIONS.map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
                  {i + 1}
                </div>
                <p className="text-sm text-zinc-400">{m.question}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className={COMPONENTS.inputField}
            />
            <button
              type="submit"
              className={`${COMPONENTS.buttonPrimary} w-full flex items-center justify-center gap-2 py-3`}
            >
              Empezar las misiones <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="text-center text-xs text-zinc-600">Sin tarjeta. Sin spam. Solo transformación.</p>
        </div>
      )}

      {/* Steps 1-3: Mission questions */}
      {typeof step === "number" && step >= 1 && step <= 3 && (
        <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" key={step}>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              {mission.label}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold leading-snug">{mission.question}</h2>
            <p className="text-sm text-zinc-500 italic">{mission.hint}</p>
          </div>

          <textarea
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setError(""); }}
            placeholder={mission.placeholder}
            rows={5}
            className={`${COMPONENTS.inputField} resize-none`}
            autoFocus
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleMissionNext}
            disabled={loading || current.trim().length < 10}
            className={`${COMPONENTS.buttonPrimary} w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50`}
          >
            {loading ? "Enviando..." : step === 3 ? "Desbloquear acceso" : "Siguiente misión"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          {/* Completed missions */}
          {step > 1 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              {answers.slice(0, step - 1).map((ans, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                  <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
                  <span className="line-clamp-1">{ans}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="w-full max-w-lg space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="space-y-4">
            <div className="text-6xl animate-bounce">🌟</div>
            <h1 className="text-3xl md:text-4xl font-bold">Acceso desbloqueado</h1>
            <p className="text-zinc-400 text-lg">
              Has completado las tres misiones. Ya eres parte de Luciérnaga.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6 space-y-3 text-left">
            <p className="text-sm font-semibold text-violet-300">Lo que acabas de hacer</p>
            {answers.map((ans, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-violet-400" />
                <p className="text-sm text-zinc-300 line-clamp-2">{ans}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push("/app")}
              className={`${COMPONENTS.buttonPrimary} w-full flex items-center justify-center gap-2 py-3 text-base`}
            >
              Entrar a Luciérnaga <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-zinc-600">
              Tus respuestas guiarán tu primera sesión.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex items-center gap-3">
            <Lock className="h-4 w-4 shrink-0 text-zinc-600" />
            <p className="text-xs text-zinc-500">
              Cuando lleves 7 días activo/a, ganarás una invitación para traer a alguien que lo necesite.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnirsePage() {
  return (
    <Suspense>
      <UnirseContent />
    </Suspense>
  );
}
