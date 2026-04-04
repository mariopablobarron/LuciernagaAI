'use client';

import { useState } from 'react';
import { ArrowLeft, Flame } from 'lucide-react';
import Link from 'next/link';

type EmotionalState = 'blocked' | 'anxious' | 'doubt' | 'clarity' | 'unmotivated' | 'neutral';

export default function CheckinPage() {
  const [mood, setMood] = useState<'good' | 'regular' | 'bad' | null>(null);
  const [emotionalState, setEmotionalState] = useState<EmotionalState | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [challengeStatus, setChallengeStatus] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isComplete = mood && emotionalState && energyLevel && note.trim();

  const emotionalOptions = [
    { id: 'blocked', label: 'Bloqueado', icon: '🔒' },
    { id: 'anxious', label: 'Ansioso', icon: '😰' },
    { id: 'doubt', label: 'Con dudas', icon: '❓' },
    { id: 'clarity', label: 'Claro', icon: '✨' },
    { id: 'unmotivated', label: 'Sin ganas', icon: '😔' },
    { id: 'neutral', label: 'Neutral', icon: '😐' },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;

    // Mock submit
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full card-surface p-8 text-center space-y-6">
          <div className="text-6xl">✓</div>
          <h1 className="text-3xl font-bold text-white">Check-in registrado</h1>
          <p className="text-zinc-400">Buen trabajo por aparecer hoy.</p>

          {/* Streak */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-6 h-6 text-amber-500" />
              <p className="text-4xl font-bold text-white">7</p>
            </div>
            <p className="text-sm text-zinc-400">días seguidos</p>
            <p className="text-xs text-zinc-500">Mejor: 15 días</p>
          </div>

          {/* Completed Challenges */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-emerald-500 text-sm">Retos completados hoy</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white">
                <span className="text-emerald-500">✓</span>
                Morning meditation (10 min)
              </div>
              <div className="flex items-center gap-2 text-sm text-white">
                <span className="text-emerald-500">✓</span>
                Write first paragraph
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href="/impulso/retos"
              className="flex-1 py-2 px-4 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors text-center"
            >
              Ver retos
            </Link>
            <Link
              href="/app"
              className="flex-1 py-2 px-4 rounded-lg border border-zinc-700 text-white font-semibold hover:bg-zinc-900/50 transition-colors text-center"
            >
              Ir al chat
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/impulso" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Check-in de hoy</h1>
            <p className="text-sm text-zinc-500">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card-surface p-8 space-y-8">
          {/* 1. MOOD */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white">¿Cómo estuvo tu día?</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'good', label: '💪 Bien', value: 'good' },
                { id: 'regular', label: '😐 Regular', value: 'regular' },
                { id: 'bad', label: '😔 Mal', value: 'bad' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMood(option.value as 'good' | 'regular' | 'bad')}
                  className={`py-3 rounded-lg font-semibold transition-all ${
                    mood === option.value
                      ? 'bg-amber-500 text-white border-2 border-amber-400'
                      : 'bg-zinc-900 border-2 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. EMOTIONAL STATE */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white">¿Qué sentiste?</label>
            <div className="grid grid-cols-2 gap-3">
              {emotionalOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setEmotionalState(option.id)}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all text-sm ${
                    emotionalState === option.id
                      ? 'bg-indigo-500 text-white border-2 border-indigo-400'
                      : 'bg-zinc-900 border-2 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="block mt-1">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. ENERGY LEVEL */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white">Nivel de energía</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    energyLevel === level
                      ? 'bg-indigo-500 text-white'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Muy baja</span>
              <span>Muy alta</span>
            </div>
          </div>

          {/* 4. CHALLENGE STATUS */}
          <div className="space-y-3">
            <label htmlFor="challenge" className="block text-sm font-semibold text-white">
              Reto de hoy (opcional)
            </label>
            <input
              id="challenge"
              type="text"
              value={challengeStatus}
              onChange={(e) => setChallengeStatus(e.target.value)}
              placeholder="Ej: Completé los 10 minutos de arranque"
              className="input-field w-full"
            />
          </div>

          {/* 5. NOTE */}
          <div className="space-y-3">
            <label htmlFor="note" className="block text-sm font-semibold text-white">
              Nota <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Sé honesto. Qué hiciste, qué evitaste, cómo te sentiste."
                className="input-field w-full min-h-32 resize-none"
                required
              />
              <span className="absolute bottom-3 right-3 text-xs text-zinc-500">
                {note.length}/500
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isComplete}
            className="w-full py-3 px-4 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Registrar check-in
          </button>

          <p className="text-xs text-zinc-500 text-center">
            Tus respuestas nos ayudan a entenderte mejor.
          </p>
        </form>
      </div>
    </div>
  );
}
