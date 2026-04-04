'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function LandingPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} text-white`}>
      {/* HERO - 2 Column Layout */}
      <section className="relative min-h-[calc(100vh-80px)] grid md:grid-cols-2 gap-12 items-center px-4 py-24 max-w-6xl mx-auto">
        {/* Left: Text */}
        <div className="space-y-8 order-2 md:order-1">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">⚡ Transformación Real</p>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Cambia tu vida{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                un hábito a la vez
              </span>
            </h1>
          </div>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-lg">
            Luciernaga te guía a través de la transformación real. No es teoría. No es perfección. Es acción pequeña, consistente, que genera cambios duraderos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-400 transition-colors"
            >
              Empieza gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-zinc-700 text-white font-semibold rounded-lg hover:bg-zinc-900/50 transition-colors"
            >
              Ver demo
            </button>
          </div>
        </div>

        {/* Right: Chat UI Mock */}
        <div className="hidden md:block order-1 md:order-2">
          <div className="card-surface p-6 space-y-4 max-h-96 overflow-hidden relative">
            {/* Glow effect */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 blur-2xl" />
            
            {/* Mock chat messages */}
            <div className="space-y-3">
              {[
                { role: 'user', text: 'Estoy bloqueado con mi proyecto' },
                { role: 'ai', text: '¿Qué es lo más pequeño que podrías hacer en 10 minutos?' },
                { role: 'user', text: 'Abrir el archivo y escribir un párrafo' },
                { role: 'ai', text: 'Eso es. Hazlo ahora. Luego volveremos.' },
              ].map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-indigo-500/20 border border-indigo-500/30 text-white'
                        : 'bg-zinc-800/50 border border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - 3 Steps */}
      <section id="how-it-works" className="py-20 px-4 bg-zinc-900/30 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Cómo funciona</p>
            <h2 className="text-4xl md:text-5xl font-bold">Tu transformación en 3 pasos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '1', title: 'Describes cómo te sientes', desc: 'Elige tu estado emocional actual. No hay respuesta correcta.' },
              { num: '2', title: 'La IA detecta tu patrón', desc: 'Bloqueado / Ansioso / Dudoso / Claro — adaptamos la conversación.' },
              { num: '3', title: 'Recibes un próximo paso', desc: 'Específico, accionable, que puedes hacer hoy en 10 minutos.' },
            ].map((step) => (
              <div key={step.num} className="card-surface p-8 text-center space-y-4">
                <div className="text-5xl font-bold text-indigo-400">{step.num}</div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Historias reales</p>
          <h2 className="text-4xl font-bold">Personas que ya empezaron</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { quote: 'Por fin algo que no me dice qué sentir sino qué hacer.', name: 'Valentina', age: '29' },
            { quote: 'Tres semanas y ya completé mi primer reto.', name: 'Miguel', age: '34' },
            { quote: 'El check-in diario me cambió la rutina.', name: 'Priya', age: '31' },
          ].map((testimonial, i) => (
            <div key={i} className="card-surface p-6 space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <span key={j} className="text-amber-400">★</span>
                ))}
              </div>
              <p className="text-zinc-300 italic text-sm">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold">
                  {testimonial.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{testimonial.name}</p>
                  <p className="text-xs text-zinc-500">{testimonial.age} años</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-4 bg-zinc-900/30 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Planes</p>
            <h2 className="text-4xl font-bold">Elige tu camino</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Gratuito',
                description: 'Perfecto para empezar',
                price: 'Gratis',
                features: ['Chat ilimitado', 'Detección de estado', 'Primer reto gratis', 'Acceso exploración'],
                cta: 'Empezar ahora',
                href: '/explore',
                featured: false,
              },
              {
                title: 'Impulso',
                description: 'Programa intensivo 21 días',
                price: 'Próximamente',
                features: ['Todo lo del plan Gratuito', 'Programa Impulso 21 días', 'Check-ins diarios', 'Retos personalizados', 'Mensajes futuros', 'Soporte prioritario'],
                cta: 'Unirse a lista de espera',
                href: '#',
                featured: true,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-xl border p-8 space-y-6 ${
                  plan.featured
                    ? 'ring-2 ring-indigo-500 bg-indigo-500/5'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div>
                  <h3 className="text-2xl font-bold">{plan.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{plan.price}</p>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="text-indigo-400 font-bold">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full py-2 px-4 rounded-lg font-semibold text-center transition-colors block ${
                    plan.featured
                      ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                      : 'border border-zinc-700 text-white hover:bg-zinc-900'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative min-h-96 flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 blur-3xl" />
        </div>

        <div className="max-w-3xl text-center space-y-6">
          <h2 className="text-5xl md:text-6xl font-bold">¿Listo para tu primer paso?</h2>
          <p className="text-lg text-zinc-400">Empieza en menos de 60 segundos. Sin registro obligatorio.</p>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white font-bold rounded-lg hover:from-indigo-400 hover:to-indigo-300 transition-all hover:shadow-lg hover:shadow-indigo-500/50"
          >
            Abrir Luciernaga AI <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-zinc-500 pt-4">
            Luciernaga AI no sustituye terapia ni intervención psicológica profesional.
          </p>
        </div>
      </section>
    </div>
  );
}
