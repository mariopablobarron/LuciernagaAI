"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StreakSnapshot } from "@/types/impulse";

const MOODS = [
  { value: "positive", label: "Bien", emoji: "💪" },
  { value: "neutral", label: "Regular", emoji: "😐" },
  { value: "negative", label: "Mal", emoji: "😔" },
];

const EMOTIONAL_STATES = [
  { value: "activo", label: "Activo / Claro" },
  { value: "ansioso", label: "Ansioso / Nervioso" },
  { value: "bloqueado", label: "Bloqueado / Paralizado" },
  { value: "desmotivado", label: "Sin ganas / Desmotivado" },
  { value: "perdido", label: "Perdido / Sin dirección" },
  { value: "neutral", label: "Neutral / Normal" },
];

type CheckinResult = {
  ok: boolean;
  streak: StreakSnapshot;
  challenges: Array<{ title: string; completedDays: number; totalDays: number; status: string }>;
};

export default function CheckinPage() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [emotionalState, setEmotionalState] = useState<string | null>(null);
  const [momentum, setMomentum] = useState<number | null>(null);
  const [challengeStatus, setChallengeStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!note.trim() || !mood || !emotionalState) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: note,
          mood,
          emotionalState,
          momentum,
          challengeStatus: challengeStatus.trim() || null,
        }),
      });
      const data = (await res.json()) as CheckinResult;
      setResult(data);
    } catch {
      setError("Error al guardar el check-in. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const { streak, challenges } = result;
    const justCompleted = challenges.filter((c) => c.status === "completed");
    const stillActive = challenges.filter((c) => c.status === "active");

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <div className="max-w-lg w-full space-y-6 text-center">
          <div className="text-6xl">✓</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Check-in registrado</h2>
            <p className="text-zinc-400 text-sm">Buen trabajo por aparecer hoy.</p>
          </div>

          {/* Streak */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">Racha</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-bold text-amber-400">{streak.currentDays}</span>
              <div className="text-left">
                <p className="text-zinc-300 text-sm">días seguidos</p>
                <p className="text-zinc-600 text-xs">Mejor: {streak.bestDays}</p>
              </div>
            </div>
            {streak.status === "restarted" && (
              <p className="text-orange-400 text-xs mt-2">Racha reiniciada — hoy volviste a empezar.</p>
            )}
          </div>

          {/* Completed challenges */}
          {justCompleted.length > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
              <p className="text-emerald-400 text-sm font-medium mb-2">🎉 Reto completado</p>
              {justCompleted.map((c) => (
                <p key={c.title} className="text-zinc-300 text-sm">{c.title}</p>
              ))}
            </div>
          )}

          {/* Active challenge progress */}
          {stillActive.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-2">
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Progreso de retos</p>
              {stillActive.map((c) => (
                <div key={c.title} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 truncate">{c.title}</span>
                  <span className="text-zinc-500 font-mono ml-3 flex-shrink-0">
                    {c.completedDays}/{c.totalDays} días
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => router.push("/impulso/retos")}
              className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl text-sm hover:bg-amber-300 transition"
            >
              Ver retos
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full border border-zinc-700 text-zinc-300 py-3 rounded-xl text-sm hover:border-zinc-500 transition"
            >
              Ir al chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = note.trim().length > 0 && mood !== null && emotionalState !== null;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-300 text-sm">
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold">Check-in de hoy</h1>
            <p className="text-zinc-500 text-xs">
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>

        {/* Mood */}
        <div className="space-y-3">
          <label className="text-zinc-400 text-sm block">¿Cómo estás hoy?</label>
          <div className="grid grid-cols-3 gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`py-3 rounded-xl border text-center transition ${
                  mood === m.value
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="block text-xl">{m.emoji}</span>
                <span className="text-xs mt-1">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Emotional state */}
        <div className="space-y-3">
          <label className="text-zinc-400 text-sm block">¿Cuál se acerca más a tu estado?</label>
          <div className="space-y-2">
            {EMOTIONAL_STATES.map((s) => (
              <button
                key={s.value}
                onClick={() => setEmotionalState(s.value)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition ${
                  emotionalState === s.value
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Momentum 1–5 */}
        <div className="space-y-3">
          <label className="text-zinc-400 text-sm block">
            Energía disponible hoy <span className="text-zinc-600">(opcional)</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setMomentum(momentum === v ? null : v)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-mono transition ${
                  momentum === v
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-zinc-600 px-1">
            <span>Muy baja</span>
            <span>Muy alta</span>
          </div>
        </div>

        {/* Challenge status */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-sm block">
            ¿Avanzaste en tu reto hoy? <span className="text-zinc-600">(opcional)</span>
          </label>
          <input
            type="text"
            value={challengeStatus}
            onChange={(e) => setChallengeStatus(e.target.value)}
            placeholder="Ej: Completé los 10 minutos de arranque"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-sm block">
            ¿Qué pasó hoy? <span className="text-zinc-500">*</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Sé honesto. Qué hiciste, qué evitaste, cómo te sentiste."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
          />
          <p className="text-zinc-600 text-xs text-right">{note.length} caracteres</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit || loading}
          className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl text-sm hover:bg-amber-300 transition disabled:opacity-30"
        >
          {loading ? "Guardando..." : "Registrar check-in"}
        </button>
      </div>
    </div>
  );
}
