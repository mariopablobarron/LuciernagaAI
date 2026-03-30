"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImpulseProfileSnapshot, StreakSnapshot } from "@/types/impulse";

type ProfileData = {
  success: boolean;
  profile: ImpulseProfileSnapshot | null;
  streak: StreakSnapshot | null;
};

const PROFILE_COLORS: Record<string, string> = {
  BLOQUEADO: "text-red-400 border-red-400/30 bg-red-400/5",
  ANSIOSO: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  DESMOTIVADO: "text-blue-400 border-blue-400/30 bg-blue-400/5",
  PERDIDO: "text-purple-400 border-purple-400/30 bg-purple-400/5",
  POTENCIAL_ALTO: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
};

export default function PerfilPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/challenge/assign")
      .then((r) => r.json() as Promise<ProfileData>)
      .then(setData)
      .finally(() => setLoading(false));
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
        <p className="text-zinc-400 text-center">Aún no tienes un perfil asignado.</p>
        <button
          onClick={() => router.push("/impulso/diagnostico")}
          className="bg-amber-400 text-black font-bold px-6 py-3 rounded-xl text-sm"
        >
          Hacer diagnóstico
        </button>
      </div>
    );
  }

  const { profile, streak } = data;
  const colorClass = PROFILE_COLORS[profile.code] ?? "text-amber-400 border-amber-400/30 bg-amber-400/5";

  const dims = [
    { label: "Claridad", value: profile.scores.claridad },
    { label: "Autoestima", value: profile.scores.autoestima },
    { label: "Energía", value: profile.scores.energia },
    { label: "Disciplina", value: profile.scores.disciplina },
    { label: "Social", value: profile.scores.social },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-300 text-sm">
            ← Volver
          </button>
          <button
            onClick={() => router.push("/impulso/diagnostico")}
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            Repetir diagnóstico
          </button>
        </div>

        {/* Profile card */}
        <div className={`border rounded-2xl p-6 space-y-3 ${colorClass}`}>
          <p className="text-xs font-mono uppercase tracking-widest opacity-70">Tu perfil</p>
          <h1 className="text-2xl font-bold">{profile.title}</h1>
          <p className="text-sm opacity-80 leading-relaxed">{profile.description}</p>
        </div>

        {/* Operational focus */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Foco esta semana</p>
          <p className="text-zinc-200 text-sm leading-relaxed">{profile.operationalFocus}</p>
        </div>

        {/* Scores */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Puntuaciones</p>
          {dims.map((dim) => (
            <div key={dim.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{dim.label}</span>
                <span className="text-zinc-300 font-mono">{dim.value}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${dim.value}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-right text-xs text-zinc-500 font-mono">
            Total: {profile.scores.total}%
          </p>
        </div>

        {/* Streak */}
        {streak && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Racha actual</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{streak.currentDays} días</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-xs">Mejor racha</p>
                <p className="text-zinc-300 font-mono text-lg">{streak.bestDays}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push("/impulso/retos")}
            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl text-sm hover:bg-amber-300 transition"
          >
            Ver retos activos
          </button>
          <button
            onClick={() => router.push("/impulso/checkin")}
            className="w-full border border-zinc-700 text-zinc-300 py-3 rounded-xl text-sm hover:border-zinc-500 transition"
          >
            Hacer check-in de hoy
          </button>
        </div>

        <p className="text-center text-zinc-600 text-xs">
          Perfil asignado el {new Date(profile.assignedAt).toLocaleDateString("es-ES")}
        </p>
      </div>
    </div>
  );
}
