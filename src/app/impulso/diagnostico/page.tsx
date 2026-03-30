"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiagnosticQuestion, ImpulseProfileSnapshot } from "@/types/impulse";

const SCALE_LABELS = ["Nada", "Poco", "Algo", "Bastante", "Mucho"];

type Step = "intro" | "test" | "result";

type DiagnosticData = {
  test: DiagnosticQuestion[];
};

type ResultData = {
  profile: ImpulseProfileSnapshot;
};

export default function DiagnosticoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<ImpulseProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostic");
      const data = (await res.json()) as DiagnosticData & { success?: boolean };
      setQuestions(data.test ?? []);
      setStep("test");
      setCurrentIndex(0);
      setAnswers({});
    } catch {
      setError("No se pudo cargar el test. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submitAnswers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as ResultData & { success?: boolean };
      setResult(data.profile);
      setStep("result");
    } catch {
      setError("Error al procesar las respuestas. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  if (step === "intro") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <div className="max-w-lg w-full space-y-8 text-center">
          <div className="space-y-3">
            <p className="text-amber-400 text-sm font-mono uppercase tracking-widest">Modo Impulso</p>
            <h1 className="text-3xl font-bold leading-tight">Diagnóstico inicial</h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              12 preguntas. 3 minutos. Te asignaremos un perfil operativo y retos
              personalizados para que dejes de dar vueltas y empieces a avanzar.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-2">
            <p className="text-zinc-300 text-sm">Vas a evaluar 5 dimensiones:</p>
            {["Claridad de dirección", "Autoestima operativa", "Energía disponible", "Disciplina real", "Conexión social"].map((dim) => (
              <div key={dim} className="flex items-center gap-2 text-zinc-400 text-sm">
                <span className="text-amber-400">→</span>
                <span>{dim}</span>
              </div>
            ))}
          </div>
          <button
            onClick={startTest}
            disabled={loading}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl text-sm hover:bg-amber-300 transition disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Empezar diagnóstico"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  if (step === "test" && currentQuestion) {
    const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
      <div className="min-h-screen bg-black text-white flex flex-col px-6 py-10">
        <div className="max-w-lg w-full mx-auto space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Pregunta {currentIndex + 1} de {questions.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="space-y-6">
            <p className="text-lg font-medium leading-relaxed">{currentQuestion.prompt}</p>

            <div className="space-y-2">
              {SCALE_LABELS.map((label, idx) => {
                const value = idx + 1;
                const selected = currentAnswer === value;
                return (
                  <button
                    key={value}
                    onClick={() => selectAnswer(currentQuestion.id, value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition ${
                      selected
                        ? "border-amber-400 bg-amber-400/10 text-amber-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${selected ? "border-amber-400 bg-amber-400 text-black" : "border-zinc-600"}`}>
                      {value}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex((i) => i - 1)}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-500 transition"
              >
                Anterior
              </button>
            )}
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((i) => i + 1)}
                disabled={currentAnswer === undefined}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-30"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={submitAnswers}
                disabled={!allAnswered || loading}
                className="flex-1 py-3 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition disabled:opacity-30"
              >
                {loading ? "Analizando..." : "Ver mi perfil"}
              </button>
            )}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    const scores = result.scores;
    const dims = [
      { label: "Claridad", value: scores.claridad },
      { label: "Autoestima", value: scores.autoestima },
      { label: "Energía", value: scores.energia },
      { label: "Disciplina", value: scores.disciplina },
      { label: "Social", value: scores.social },
    ];

    return (
      <div className="min-h-screen bg-black text-white flex flex-col px-6 py-10">
        <div className="max-w-lg w-full mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="text-amber-400 text-xs font-mono uppercase tracking-widest">Tu perfil</p>
            <h1 className="text-3xl font-bold">{result.title}</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">{result.description}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <p className="text-zinc-300 text-xs font-mono uppercase tracking-widest">Puntuaciones</p>
            {dims.map((dim) => (
              <div key={dim.label} className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{dim.label}</span>
                  <span>{dim.value}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className="bg-amber-400 h-1.5 rounded-full"
                    style={{ width: `${dim.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-amber-400/20 rounded-xl p-5 space-y-2">
            <p className="text-amber-400 text-xs font-mono uppercase tracking-widest">Foco operativo</p>
            <p className="text-zinc-200 text-sm leading-relaxed">{result.operationalFocus}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/impulso/retos")}
              className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl text-sm hover:bg-amber-300 transition"
            >
              Ver mis retos asignados
            </button>
            <button
              onClick={() => router.push("/impulso/perfil")}
              className="w-full border border-zinc-700 text-zinc-300 py-3 rounded-xl text-sm hover:border-zinc-500 transition"
            >
              Ver perfil completo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
