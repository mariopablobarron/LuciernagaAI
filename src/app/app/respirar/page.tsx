"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Wind, Play, Pause, RotateCcw } from "lucide-react";

type Phase = "inhale" | "hold" | "exhale" | "holdOut";

type Exercise = {
  id: string;
  title: string;
  description: string;
  phases: { type: Phase; duration: number }[];
  totalCycles: number;
};

const EXERCISES: Exercise[] = [
  {
    id: "478",
    title: "Respiración 4-7-8",
    description: "Inhalar 4s, retener 7s, exhalar 8s. Calma profunda.",
    phases: [
      { type: "inhale", duration: 4 },
      { type: "hold", duration: 7 },
      { type: "exhale", duration: 8 },
    ],
    totalCycles: 4,
  },
  {
    id: "box",
    title: "Box Breathing",
    description: "4 tiempos iguales. Control y equilibrio.",
    phases: [
      { type: "inhale", duration: 4 },
      { type: "hold", duration: 4 },
      { type: "exhale", duration: 4 },
      { type: "holdOut", duration: 4 },
    ],
    totalCycles: 4,
  },
  {
    id: "coherencia",
    title: "Coherencia cardíaca",
    description: "Inhalar 5s, exhalar 5s. 2 minutos de calma.",
    phases: [
      { type: "inhale", duration: 5 },
      { type: "exhale", duration: 5 },
    ],
    totalCycles: 6,
  },
];

const PHASE_LABELS: Record<Phase, string> = {
  inhale: "Inhala",
  hold: "Retén",
  exhale: "Exhala",
  holdOut: "Retén",
};

const PHASE_COLORS: Record<Phase, { ring: string; bg: string; text: string }> = {
  inhale: { ring: "border-violet-500", bg: "bg-violet-500/10", text: "text-violet-400" },
  hold: { ring: "border-amber-500", bg: "bg-amber-500/10", text: "text-amber-400" },
  exhale: { ring: "border-cyan-500", bg: "bg-cyan-500/10", text: "text-cyan-400" },
  holdOut: { ring: "border-amber-500", bg: "bg-amber-500/10", text: "text-amber-400" },
};

export default function RespirarPage() {
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [running, setRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = activeExercise?.phases[phaseIndex];
  const phaseDuration = currentPhase?.duration ?? 1;

  // Circle scale: inhale = expanding, exhale = contracting, hold = static
  const getScale = () => {
    if (!currentPhase || !running) return 0.6;
    const elapsed = phaseDuration - phaseTimeLeft;
    const progress = elapsed / phaseDuration;
    switch (currentPhase.type) {
      case "inhale":
        return 0.4 + progress * 0.6;
      case "exhale":
        return 1.0 - progress * 0.6;
      case "hold":
      case "holdOut":
        return currentPhase.type === "hold" ? 1.0 : 0.4;
      default:
        return 0.6;
    }
  };

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setCurrentCycle(1);
    setPhaseIndex(0);
    setFinished(false);
    if (activeExercise) {
      setPhaseTimeLeft(activeExercise.phases[0].duration);
    }
  }, [activeExercise, clearTimer]);

  const selectExercise = (ex: Exercise) => {
    clearTimer();
    setActiveExercise(ex);
    setRunning(false);
    setCurrentCycle(1);
    setPhaseIndex(0);
    setPhaseTimeLeft(ex.phases[0].duration);
    setFinished(false);
  };

  // Timer tick
  useEffect(() => {
    if (!running || !activeExercise || finished) return;

    intervalRef.current = setInterval(() => {
      setPhaseTimeLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Advance to next phase
        const nextPhaseIndex = phaseIndex + 1;
        if (nextPhaseIndex < activeExercise.phases.length) {
          setPhaseIndex(nextPhaseIndex);
          return activeExercise.phases[nextPhaseIndex].duration;
        }

        // Next cycle
        const nextCycle = currentCycle + 1;
        if (nextCycle <= activeExercise.totalCycles) {
          setCurrentCycle(nextCycle);
          setPhaseIndex(0);
          return activeExercise.phases[0].duration;
        }

        // Done
        setRunning(false);
        setFinished(true);
        clearTimer();
        return 0;
      });
    }, 1000);

    return () => clearTimer();
  }, [running, activeExercise, phaseIndex, currentCycle, finished, clearTimer]);

  const toggleRunning = () => {
    if (finished) {
      reset();
      return;
    }
    setRunning((prev) => !prev);
  };

  const scale = getScale();
  const colors = currentPhase ? PHASE_COLORS[currentPhase.type] : PHASE_COLORS.inhale;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wind className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Ejercicios de Respiración</h1>
        </div>
        <p className="text-sm text-zinc-400 max-w-xl">
          Técnicas guiadas para calmar tu sistema nervioso. Elige un ejercicio y sigue el ritmo.
        </p>
      </div>

      {/* Exercise selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {EXERCISES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => selectExercise(ex)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              activeExercise?.id === ex.id
                ? "border-violet-500/50 bg-violet-500/10"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
            }`}
          >
            <h3 className="text-sm font-semibold text-white">{ex.title}</h3>
            <p className="text-xs text-zinc-500 mt-1">{ex.description}</p>
          </button>
        ))}
      </div>

      {/* Active exercise */}
      {activeExercise && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 flex flex-col items-center space-y-8">
          {/* Breathing circle */}
          <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
            <div
              className={`rounded-full border-4 ${colors.ring} ${colors.bg} transition-all duration-1000 ease-in-out flex items-center justify-center`}
              style={{
                width: `${scale * 100}%`,
                height: `${scale * 100}%`,
              }}
            >
              {!finished ? (
                <div className="text-center">
                  <p className={`text-lg font-bold ${colors.text}`}>
                    {running ? PHASE_LABELS[currentPhase!.type] : "Listo"}
                  </p>
                  <p className="text-3xl font-bold text-white tabular-nums">
                    {running ? phaseTimeLeft : ""}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">Completado</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500">
              Ciclo {currentCycle} de {activeExercise.totalCycles}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: activeExercise.totalCycles }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-6 rounded-full transition-colors ${
                    i < currentCycle
                      ? finished || i < currentCycle - 1
                        ? "bg-violet-500"
                        : "bg-violet-500/50"
                      : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleRunning}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-colors"
            >
              {finished ? (
                <>
                  <RotateCcw className="h-4 w-4" /> Repetir
                </>
              ) : running ? (
                <>
                  <Pause className="h-4 w-4" /> Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Iniciar
                </>
              )}
            </button>
            {(running || phaseIndex > 0 || currentCycle > 1) && !finished && (
              <button
                onClick={reset}
                className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Reiniciar
              </button>
            )}
          </div>
        </div>
      )}

      {!activeExercise && (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-sm text-zinc-500">
            Selecciona un ejercicio de arriba para empezar.
          </p>
        </div>
      )}
    </div>
  );
}
