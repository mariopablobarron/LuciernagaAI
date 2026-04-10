'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Target, CheckCircle2 } from 'lucide-react';
import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';
import HeartbeatParticles from '@/components/effects/HeartbeatParticles';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Chat Mockup ─────────────────────────────────────────────────────────────

const MOCK_MESSAGES = [
  { role: 'user', text: 'Llevo semanas sin avanzar con el proyecto' },
  { role: 'ai', text: '¿Qué es lo más pequeño que podrías hacer en los próximos 10 minutos?' },
  { role: 'user', text: 'Supongo que abrir el archivo y escribir un párrafo' },
  { role: 'ai', text: 'Eso es exactamente lo que necesitas. Hazlo ahora. Luego me cuentas.' },
];

function ChatMockup() {
  return (
    <div className="relative">
      {/* Glow effect behind card */}
      <div className="absolute -inset-4 bg-linear-to-br from-violet-500/20 via-fuchsia-500/15 to-cyan-500/10 rounded-3xl blur-2xl" />

      <div className="relative rounded-2xl border border-zinc-700/60 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
          </div>
          <div className="flex-1 mx-3 h-5 rounded-full bg-zinc-800/60 flex items-center px-3">
            <span className="text-[10px] text-zinc-600">tresmilmillonesdelatidos.es/app</span>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3">
          {MOCK_MESSAGES.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-violet-600/80 text-white rounded-tr-sm'
                    : 'bg-zinc-800 text-zinc-100 border border-zinc-700/50 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="flex items-center gap-1 px-3.5 py-2 bg-zinc-800 rounded-2xl rounded-tl-sm border border-zinc-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-4 py-2.5">
            <span className="flex-1 text-sm text-zinc-600">Escribe lo que te pasa…</span>
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Target,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    title: 'Sin juicios',
    description:
      'Solo preguntas que te hacen avanzar. Sin consejos no pedidos, sin evaluaciones, sin presión.',
  },
  {
    icon: Zap,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    title: 'Estado real',
    description:
      'Detecta si estás bloqueado, ansioso o con claridad y adapta la conversación a donde realmente estás.',
  },
  {
    icon: CheckCircle2,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    title: 'Acción concreta',
    description:
      'Cada conversación termina con un siguiente paso real que puedes ejecutar hoy en menos de 10 minutos.',
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LandingPageDesign() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <HeartbeatParticles />
      {/* Navigation */}
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-20 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Text */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/40 bg-violet-500/8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-xs font-medium text-violet-300">Tres mil millones de latidos</span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                  Haz que cuenten{' '}
                  <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                    tus próximos latidos.
                  </span>
                </h1>
                <p className="text-lg text-zinc-300 leading-relaxed max-w-lg">
                  El corazón humano late tres mil millones de veces en una vida.
                  Tres Mil Millones de Latidos existe para que los que te quedan tengan dirección real.
                  No teoría. No perfección. Acción concreta, latido a latido.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Empieza gratis <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() =>
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Ver cómo funciona
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2.5">
                  {[
                    { initial: 'V', bg: 'bg-violet-500' },
                    { initial: 'M', bg: 'bg-fuchsia-500' },
                    { initial: 'P', bg: 'bg-violet-600' },
                    { initial: 'A', bg: 'bg-cyan-600' },
                    { initial: 'L', bg: 'bg-cyan-500' },
                  ].map((a, i) => (
                    <div
                      key={i}
                      className={`w-9 h-9 rounded-full ${a.bg} flex items-center justify-center font-bold text-white border-2 border-zinc-950 text-xs ring-1 ring-zinc-800`}
                    >
                      {a.initial}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">
                    <span className="text-white font-bold">+200 personas</span> latiendo diferente
                  </p>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-amber-400 text-xs">★</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-base">🇪🇸</span>
                <p className="text-xs text-zinc-500">
                  Mentoría con IA en español. Cada latido, una elección real.
                </p>
              </div>
            </div>

            {/* Right: Chat mockup */}
            <div className="hidden md:block">
              <ChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 border-t border-zinc-800/60 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
              Cómo funciona
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Cada latido, un paso hacia adelante
            </h2>
            <p className="text-zinc-300 text-lg max-w-xl mx-auto leading-relaxed">
              Una mentoría que entiende dónde estás y te acompaña hacia la acción latido a latido.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className={`group p-8 rounded-2xl border bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-900/70 transition-all ${f.border}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-zinc-300 text-base leading-relaxed">{f.description}</p>
                  <div className="mt-6 h-0.5 w-0 bg-linear-to-r from-violet-400 to-cyan-400 group-hover:w-full transition-all duration-500" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-zinc-900/30 border-y border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-3">
              El proceso
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tu cambio en 3 latidos
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: '01',
                title: 'Describes cómo te sientes',
                desc: 'Sin filtros, sin juicio. Cuéntale a Tres Mil Millones de Latidos qué te pasa, qué evitas, qué te frena.',
              },
              {
                num: '02',
                title: 'Obtienes claridad',
                desc: 'Bloqueado, ansioso, con duda o con claridad — la conversación se adapta a donde estás.',
              },
              {
                num: '03',
                title: 'Actúas en menos de 5 min',
                desc: 'Un siguiente paso concreto, accionable, que genera momentum real desde hoy.',
              },
            ].map((step) => (
              <div key={step.num} className="text-center space-y-3">
                <div className="text-4xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-zinc-300 text-base leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            Algunos latidos ya pasaron.
            <br />
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Los que vienen aún son tuyos.
            </span>
          </h2>
          <p className="text-lg text-zinc-300 leading-relaxed">
            Tres mil millones de latidos en una vida. ¿Cuántos ya pasaron sin sentirlos?
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Empieza a latir diferente <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-xs text-zinc-500">
            No sustituye terapia ni intervención psicológica profesional.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
