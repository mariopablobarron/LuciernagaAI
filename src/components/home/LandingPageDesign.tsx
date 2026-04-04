'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function LandingPageDesign() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* ─── HERO SECTION ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12 overflow-hidden">
        {/* Radial glow background */}
        <div className="absolute inset-0 -z-10 opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 blur-3xl" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur">
          <span className="relative flex h-2 w-2 rounded-full bg-indigo-400">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          </span>
          <span className="text-xs font-medium text-zinc-300">Mentoría conversacional con IA</span>
        </div>

        {/* H1 */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-center leading-tight mb-6 max-w-4xl">
          Deja de darle{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            vueltas.
          </span>
          <br />
          Empieza a actuar.
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-zinc-400 text-center max-w-2xl mb-8 leading-relaxed">
          Luciernaga AI convierte tu bloqueo en claridad y tu claridad en acción concreta.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-zinc-950 font-semibold rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Empieza ahora <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-zinc-700 text-white font-semibold rounded-lg hover:bg-zinc-900/50 transition-colors"
          >
            Ver cómo funciona
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-zinc-500 text-center max-w-lg">
          Luciernaga AI no sustituye terapia ni intervención psicológica profesional.
        </p>
      </section>

      {/* ─── SOCIAL PROOF BAR ─── */}
      <section className="border-y border-zinc-800 bg-zinc-900/30 backdrop-blur py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-8">
          {/* Avatar stack */}
          <div className="flex items-center">
            <div className="flex -space-x-3">
              {[
                { initial: 'V', bg: 'bg-indigo-500' },
                { initial: 'M', bg: 'bg-purple-500' },
                { initial: 'P', bg: 'bg-pink-500' },
                { initial: 'A', bg: 'bg-blue-500' },
                { initial: 'L', bg: 'bg-cyan-500' },
              ].map((avatar, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-full ${avatar.bg} flex items-center justify-center font-bold text-white border-2 border-zinc-950 text-sm`}
                >
                  {avatar.initial}
                </div>
              ))}
            </div>
          </div>

          {/* Text */}
          <p className="text-center sm:text-left text-zinc-300 font-medium">
            Más de <span className="text-white font-bold">200 personas</span> ya han dado su primer paso
          </p>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="py-20 px-4 scroll-smooth">
        <div className="max-w-6xl mx-auto">
          {/* Section label */}
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-indigo-400 tracking-widest uppercase mb-3">
              Cómo funciona
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Diseñado para sacarte del bucle
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Una mentoría que entiende dónde estás bloqueado y te acompaña hacia la acción.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '○',
                title: 'Sin juicios',
                description: 'Solo preguntas que te hacen avanzar. Sin consejos no pedidos, sin evaluaciones.',
              },
              {
                icon: '◈',
                title: 'Estado real',
                description: 'Detecta si estás bloqueado, ansioso o con claridad y adapta la conversación.',
              },
              {
                icon: '◆',
                title: 'Acción concreta',
                description: 'Cada conversación termina con un siguiente paso real que puedes ejecutar hoy.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
              >
                {/* Icon */}
                <div className="text-4xl font-light text-indigo-400 mb-4 group-hover:text-indigo-300 transition-colors">
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-zinc-400 leading-relaxed text-sm">
                  {feature.description}
                </p>

                {/* Hover indicator */}
                <div className="mt-6 h-0.5 w-0 bg-gradient-to-r from-indigo-400 to-transparent group-hover:w-full transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA SECTION ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        {/* Radial glow background */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 blur-3xl" />
        </div>

        {/* Content */}
        <div className="max-w-3xl text-center">
          <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            ¿Listo para tu primer paso?
          </h2>

          <p className="text-lg sm:text-xl text-zinc-400 mb-12 leading-relaxed">
            Empieza en menos de 60 segundos. Sin registro obligatorio.
          </p>

          {/* CTA Button */}
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white font-bold rounded-lg hover:from-indigo-400 hover:to-indigo-300 transition-all hover:shadow-lg hover:shadow-indigo-500/50"
          >
            Abrir Luciernaga AI <ArrowRight className="w-5 h-5" />
          </Link>

          {/* Disclaimer */}
          <p className="text-xs text-zinc-500 mt-8">
            Luciernaga AI no sustituye terapia ni intervención psicológica profesional.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔥</span>
                <span className="font-bold text-lg text-white">Luciernaga</span>
              </div>
              <p className="text-sm text-zinc-400">
                Mentoría conversacional con IA para sacarte del bucle.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <Link href="/explore" className="hover:text-indigo-400 transition-colors">
                    Empieza ahora
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-indigo-400 transition-colors">
                    Tu progreso
                  </Link>
                </li>
              </ul>
            </div>

            {/* Info */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <Link href="/api/legal" className="hover:text-indigo-400 transition-colors">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <a href="mailto:hola@luciernaga.ai" className="hover:text-indigo-400 transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-zinc-800 pt-8 text-center text-sm text-zinc-500">
            <p>
              © 2024 Luciernaga AI. Hecho con intencion. Deja de darle vueltas, empieza a actuar.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
