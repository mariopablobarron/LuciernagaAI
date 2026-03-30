"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImpulseChallengeSnapshot, ImpulseProfileSnapshot, StreakSnapshot } from "@/types/impulse";

type ChallengesData = {
  success: boolean;
  profile: ImpulseProfileSnapshot | null;
  challenges: ImpulseChallengeSnapshot[];
  streak: StreakSnapshot | null;
};

const TYPE_LABELS: Record<string, string> = {
  ejecucion: "Ejecución",
  claridad: "Claridad",
  energia: "Energía",
  disciplina: "Disciplina",
  social: "Social",
};

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Fácil",
  2: "Medio",
  3: "Avanzado",
};

function ProgressRing({ progress }: { progress: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <svg width="68" height="68" className="rotate-[-90deg]">
      <circle cx="34" cy="34" r={r} stroke="#27272a" strokeWidth="5" fill="none" />
      <circle
        cx="34"
        cy="34"
        r={r}
        stroke="#fbbf24"
        strokeWidth="5"
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all"
      />
    </svg>
  );
}

function ChallengeCard({ challenge }: { challenge: ImpulseChallengeSnapshot }) {
  const isCompleted = challenge.status === "completed";

  return (
    <div className={`bg-zinc-900 border rounded-xl p-5 space-y-4 ${isCompleted ? "border-emerald-800/50 opacity-70" : "border-zinc-800"}`}>
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <ProgressRing progress={challenge.progress} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-400">
            {challenge.progress}%
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-zinc-500 text-xs">{TYPE_LABELS[challenge.type] ?? challenge.type}</span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-zinc-500 text-xs">{DIFFICULTY_LABEL[challenge.difficulty] ?? "—"}</span>
            {isCompleted && (
              <span className="text-emerald-400 text-xs font-medium">Completado</span>
            )}
          </div>
          <h3 className="text-white font-semibold text-base leading-snug">{challenge.title}</h3>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{challenge.description}</p>
        </div>
      </div>

      <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
        <p className="text-zinc-500 text-xs font-mono uppercase">Instrucción</p>
        <p className="text-zinc-300 text-sm leading-relaxed">{challenge.instructions}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Día {challenge.completedDays}/{challenge.totalDays}</span>
        <span>~{challenge.estimatedMinutes} min/día</span>
        <span className="text-zinc-600">{challenge.successMetric}</span>
      </div>
    </div>
  );
}

export default function RetosPage() {
  const router = useRouter();
  const [data, setData] = useState<ChallengesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/challenge/assign");
      setData(await res.json() as ChallengesData);
    } finally {
      setLoading(false);
    }
  }

  async function assignNew() {
    setAssigning(true);
    try {
      const res = await fetch("/api/challenge/assign", { method: "POST" });
      setData(await res.json() as ChallengesData);
    } finally {
      setAssigning(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 gap-6">
        <p className="text-zinc-400 text-center">Primero completa el diagnóstico para ver tus retos.</p>
        <button
          onClick={() => router.push("/impulso/diagnostico")}
          className="bg-amber-400 text-black font-bold px-6 py-3 rounded-xl text-sm"
        >
          Hacer diagnóstico
        </button>
      </div>
    );
  }

  const { challenges, streak } = data;
  const active = challenges.filter((c) => c.status === "active");
  const completed = challenges.filter((c) => c.status === "completed");

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-300 text-sm">
            ← Volver
          </button>
          {streak && (
            <div className="flex items-center gap-1.5 text-amber-400 text-sm font-mono">
              <span>🔥</span>
              <span>{streak.currentDays} días</span>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold">Retos activos</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Perfil: <span className="text-zinc-300">{data.profile.title}</span>
          </p>
        </div>

        {/* Active challenges */}
        {active.length > 0 ? (
          <div className="space-y-4">
            {active.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-4">
            <p className="text-zinc-400 text-sm">No tienes retos activos.</p>
            <button
              onClick={assignNew}
              disabled={assigning}
              className="bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-amber-300 transition disabled:opacity-50"
            >
              {assigning ? "Asignando..." : "Asignar retos"}
            </button>
          </div>
        )}

        {/* Check-in CTA */}
        {active.length > 0 && (
          <button
            onClick={() => router.push("/impulso/checkin")}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl text-sm hover:bg-amber-300 transition"
          >
            Hacer check-in de hoy
          </button>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-3">
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Completados</p>
            {completed.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
