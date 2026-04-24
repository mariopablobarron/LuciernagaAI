"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Feeling = "bloqueo" | "ansiedad" | "duda" | "cansancio" | "claridad" | "otra";
type Timeframe = "semana" | "semanas" | "meses";
type Intent = "entender" | "decidir" | "soltar";

const FEELING_OPTIONS: { id: Feeling; label: string }[] = [
  { id: "bloqueo", label: "Bloqueo" },
  { id: "ansiedad", label: "Ansiedad" },
  { id: "duda", label: "Duda" },
  { id: "cansancio", label: "Cansancio" },
  { id: "claridad", label: "Claridad" },
  { id: "otra", label: "Otra cosa" },
];

const TIMEFRAME_OPTIONS: { id: Timeframe; label: string }[] = [
  { id: "semana", label: "Esta semana" },
  { id: "semanas", label: "Desde hace unas semanas" },
  { id: "meses", label: "Desde hace meses, o más" },
];

const INTENT_OPTIONS: { id: Intent; label: string }[] = [
  { id: "entender", label: "Entenderme mejor" },
  { id: "decidir", label: "Decidir algo" },
  { id: "soltar", label: "Soltar, sin buscar nada concreto" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | "transition">(1);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [feelingCustom, setFeelingCustom] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si ya completó el onboarding, saltar directo al chat
    fetch("/api/onboarding", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.completed) router.replace("/app");
      })
      .catch(() => null);
  }, [router]);

  async function finish() {
    if (!feeling || !timeframe || !intent) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          feeling,
          feelingCustom: feeling === "otra" ? feelingCustom : null,
          timeframe,
          intent,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "No se pudo guardar. Inténtalo de nuevo.");
        setSubmitting(false);
        return;
      }
      setStep("transition");
      setTimeout(() => router.replace("/app"), 600);
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  async function skipOnboarding() {
    if (skipping || submitting) return;
    setSkipping(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skipped: true }),
      });
      if (!res.ok) {
        setError("No se pudo saltar. Inténtalo de nuevo.");
        setSkipping(false);
        return;
      }
      router.replace("/app");
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
      setSkipping(false);
    }
  }

  const canContinue1 = feeling !== null && (feeling !== "otra" || feelingCustom.trim().length > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Progress bar */}
      {step !== "transition" && (
        <div className="w-full max-w-xl mx-auto px-6 pt-8">
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  n <= (step as number) ? "bg-violet-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">Paso {step} de 3</p>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {step === 1 && (
            <section>
              <h1 className="text-2xl md:text-3xl font-semibold leading-snug">
                Antes de empezar, una cosa.
              </h1>
              <p className="mt-4 text-zinc-400">
                No te vamos a pedir que cuentes nada todavía. Solo marca qué pasa ahora.
              </p>
              <p className="mt-1 text-sm text-zinc-500">(una palabra, la que más se acerque)</p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {FEELING_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFeeling(opt.id)}
                    className={`rounded-xl border px-4 py-4 text-left font-medium transition-colors ${
                      feeling === opt.id
                        ? "border-violet-500 bg-violet-500/15 text-white"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {feeling === "otra" && (
                <input
                  autoFocus
                  type="text"
                  value={feelingCustom}
                  onChange={(e) => setFeelingCustom(e.target.value)}
                  maxLength={60}
                  placeholder="En una palabra..."
                  className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                />
              )}

              <button
                type="button"
                disabled={!canContinue1}
                onClick={() => setStep(2)}
                className="mt-10 w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-violet-400 disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                Seguir
              </button>

              <button
                type="button"
                onClick={skipOnboarding}
                disabled={skipping}
                className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300 disabled:text-zinc-700"
              >
                {skipping ? "Abriendo..." : "Saltar y hablar ya"}
              </button>

              <p className="mt-6 text-xs text-zinc-600">
                Puedes cambiarlo cuando quieras. Esto solo sirve para que la primera conversación no
                empiece en el aire.
              </p>
            </section>
          )}

          {step === 2 && (
            <section>
              <h1 className="text-2xl md:text-3xl font-semibold leading-snug">
                ¿Desde cuándo lo notas?
              </h1>
              <div className="mt-8 space-y-3">
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTimeframe(opt.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left font-medium transition-colors ${
                      timeframe === opt.id
                        ? "border-violet-500 bg-violet-500/15 text-white"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!timeframe}
                onClick={() => setStep(3)}
                className="mt-10 w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-violet-400 disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                Seguir
              </button>

              <button
                type="button"
                onClick={skipOnboarding}
                disabled={skipping}
                className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300 disabled:text-zinc-700"
              >
                {skipping ? "Abriendo..." : "Saltar y hablar ya"}
              </button>
            </section>
          )}

          {step === 3 && (
            <section>
              <h1 className="text-2xl md:text-3xl font-semibold leading-snug">
                Última. ¿Qué buscas aquí?
              </h1>
              <p className="mt-3 text-sm text-zinc-500">
                (no hay respuesta correcta — responde con lo que menos te mienta)
              </p>
              <div className="mt-8 space-y-3">
                {INTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIntent(opt.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left font-medium transition-colors ${
                      intent === opt.id
                        ? "border-violet-500 bg-violet-500/15 text-white"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
              <button
                type="button"
                disabled={!intent || submitting}
                onClick={finish}
                className="mt-10 w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-violet-400 disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                {submitting ? "Empezando..." : "Empezar"}
              </button>

              <button
                type="button"
                onClick={skipOnboarding}
                disabled={skipping || submitting}
                className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300 disabled:text-zinc-700"
              >
                {skipping ? "Abriendo..." : "Saltar y hablar ya"}
              </button>
            </section>
          )}

          {step === "transition" && (
            <section className="text-center">
              <p className="text-xl md:text-2xl font-medium text-zinc-100 animate-pulse">
                Te estamos abriendo una conversación. No un chat.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
