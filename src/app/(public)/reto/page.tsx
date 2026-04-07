"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Target, Trophy, Users, Copy, Check } from "lucide-react";
import { COMPONENTS } from "@/styles/design-system";

type RetoStats = {
  activeStreaks: number;
  completedGoals: number;
  waitlistCount: number;
};

const STEPS = [
  {
    icon: "✍️",
    title: "Completa las 3 misiones",
    desc: "Responde las preguntas que nadie más te hace. Esto ya es el primer paso real.",
  },
  {
    icon: "🔥",
    title: "30 días de acción diaria",
    desc: "Cada día cuenta. Tu racha se actualiza cada vez que abres Tres Mil Millones de Latidos y actúas.",
  },
  {
    icon: "🌟",
    title: "Comparte tu progreso",
    desc: "Al día 7 desbloqueas una invitación. Al día 30, tres más. El cambio real se contagia.",
  },
];

const TESTIMONIALS = [
  {
    day: 12,
    text: "Por primera vez en meses sé exactamente qué tengo que hacer mañana.",
    name: "Ana M.",
  },
  {
    day: 21,
    text: "La IA me preguntó algo que me dejó sin palabras. Bien sin palabras.",
    name: "Carlos R.",
  },
  {
    day: 7,
    text: "Pensé que duraría dos días. Llevo una semana y no quiero parar.",
    name: "Sara L.",
  },
];

export default function RetoPage() {
  const [stats, setStats] = useState<RetoStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/reto")
      .then((r) => r.json())
      .then((d: RetoStats) => setStats(d))
      .catch(() => {});
  }, []);

  function copyLink() {
    void navigator.clipboard.writeText(
      typeof window !== "undefined" ? `${window.location.origin}/reto` : "/reto"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const participants = (stats?.activeStreaks ?? 0) + (stats?.waitlistCount ?? 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-24 pb-20 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute left-1/2 top-20 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
            <Flame className="h-3.5 w-3.5" />
            El reto de los 30 días
          </div>

          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            30 días.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Un cambio real.
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-zinc-400 leading-relaxed">
            No es una app más. Es un compromiso contigo mismo/a con la IA más directa que
            existe. Cada día que actúas, tu racha crece. Cada racha que crece, el cambio
            se vuelve inevitable.
          </p>

          {/* Live counter */}
          {participants > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Users className="h-4 w-4 text-fuchsia-400" />
              <span>
                <strong className="text-white">{participants.toLocaleString()}</strong>{" "}
                personas en el reto ahora mismo
              </span>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className={`${COMPONENTS.buttonPrimary} flex items-center gap-2 px-8 py-3 text-base`}
            >
              Acepta el reto <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={copyLink}
              className={`${COMPONENTS.buttonSecondary} flex items-center gap-2 px-6 py-3 text-base`}
            >
              {copied ? (
                <><Check className="h-4 w-4" /> Copiado</>
              ) : (
                <><Copy className="h-4 w-4" /> Compartir reto</>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <section className="border-y border-zinc-900 bg-zinc-950/50 px-4 py-8">
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{stats.activeStreaks}</p>
              <p className="text-xs text-zinc-500 mt-1">Rachas activas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.completedGoals}</p>
              <p className="text-xs text-zinc-500 mt-1">Objetivos completados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">30</p>
              <p className="text-xs text-zinc-500 mt-1">Días del reto</p>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">¿Cómo funciona?</h2>
            <p className="mt-3 text-zinc-500">Tres pasos. Sin complicaciones.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3"
              >
                <div className="text-3xl">{s.icon}</div>
                <h3 className="font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones / rewards */}
      <section className="px-4 py-16 bg-zinc-950/60">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Lo que desbloqueas</h2>
            <p className="mt-3 text-zinc-500">El progreso tiene recompensas reales.</p>
          </div>
          <div className="space-y-4">
            {[
              { day: 1, icon: "🌱", title: "Acceso completo", desc: "Desde el primer día tienes acceso a la IA más directa que existe." },
              { day: 7, icon: "🔥", title: "Primera invitación", desc: "Ganas 1 invitación para traer a alguien que lo necesite." },
              { day: 14, icon: "⚡", title: "Modo avanzado", desc: "La IA ajusta su intensidad a tu progreso acumulado." },
              { day: 30, icon: "🏆", title: "3 invitaciones + certificado", desc: "Completar el reto te convierte en embajador del cambio." },
            ].map((m) => (
              <div
                key={m.day}
                className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-lg">
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{m.title}</p>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      Día {m.day}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Lo que dicen en el camino</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-semibold text-orange-300">Día {t.day}</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
                <p className="text-xs text-zinc-600">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-xl space-y-6">
          <Trophy className="mx-auto h-12 w-12 text-fuchsia-400" />
          <h2 className="text-3xl font-bold">¿Estás listo/a para los 30 días?</h2>
          <p className="text-zinc-400">
            Tres preguntas. Un compromiso. Treinta días. El cambio que llevas tiempo
            aplazando empieza hoy.
          </p>
          <Link
            href="/signup"
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2 px-8 py-3 text-base`}
          >
            Acepta el reto ahora <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-zinc-600">Sin tarjeta. Sin spam. Solo 30 días.</p>
        </div>
      </section>
    </div>
  );
}
