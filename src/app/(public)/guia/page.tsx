'use client';

import Link from 'next/link';
import {
  ArrowRight, MessageCircle, Target, Brain, Flame, BookOpen,
  BarChart3, Shield, Mic, Download, Bell, Sparkles, ChevronRight,
  Zap, Heart, CheckCircle2, Map,
} from 'lucide-react';
import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';

const SECTIONS = [
  {
    id: 'start',
    icon: Sparkles,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    title: '1. Tu primer latido',
    subtitle: 'Empieza en menos de 60 segundos',
    steps: [
      { text: 'Entra en el chat desde la app', link: '/app', linkText: 'Ir al chat' },
      { text: 'Escribe lo que te pasa, sin filtros. No hay respuesta correcta.' },
      { text: 'La IA detecta tu estado emocional y adapta la conversación.' },
      { text: 'Al terminar, recibes un siguiente paso concreto que puedes hacer hoy.' },
    ],
  },
  {
    id: 'chat',
    icon: MessageCircle,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    title: '2. El Chat — tu mentor',
    subtitle: 'No es un chatbot genérico. Es un sistema que te conoce.',
    features: [
      { icon: Brain, label: 'Detección emocional', desc: 'Identifica si estás bloqueado, ansioso, en duda o con claridad.' },
      { icon: Target, label: 'Metas automáticas', desc: 'Cuando expresas una intención, el sistema crea una meta con acciones concretas.' },
      { icon: Zap, label: 'Action Lock', desc: 'Si tienes una acción pendiente, el mentor te confronta hasta que la cierres.' },
      { icon: Mic, label: 'Dictado por voz', desc: 'Pulsa el micrófono junto al input para hablar en vez de escribir.' },
      { icon: BookOpen, label: 'Modo Diario', desc: 'Activa "Diario" para escribir sin que la IA responda. Solo tú y tus pensamientos.' },
    ],
  },
  {
    id: 'explore',
    icon: Map,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    title: '3. Exploración',
    subtitle: 'Identifica qué evitas y toma acción',
    steps: [
      { text: 'Entra en "Exploración" desde la app', link: '/app/explore', linkText: 'Ir a Exploración' },
      { text: 'Verás tarjetas adaptadas a tu estado emocional actual.' },
      { text: 'Escribe tu respuesta en cada tarjeta — sin presión, sin juicio.' },
      { text: 'Al completar, el sistema puede cambiar tu estado emocional (ej: de bloqueo a duda).' },
    ],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    title: '4. Dashboard — tu progreso',
    subtitle: 'Visualiza tu evolución real',
    features: [
      { icon: Flame, label: 'Racha', desc: 'Cuenta los días seguidos que has interactuado. Meta: 21 días.' },
      { icon: Heart, label: 'Logros', desc: 'Desbloquea medallas: 3 días, 7 días, 14 días, 21 días (Transformación).' },
      { icon: Target, label: 'Meta activa', desc: 'Tu objetivo actual con sus acciones pendientes y progreso.' },
      { icon: CheckCircle2, label: 'Tendencia', desc: 'Sube, baja o igual — basado en tus emociones de los últimos días.' },
    ],
  },
  {
    id: 'journeys',
    icon: Map,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    title: '5. Itinerarios',
    subtitle: 'Programas guiados paso a paso',
    steps: [
      { text: 'Elige un itinerario según tu fase: exploración, clarificación, acción...' },
      { text: 'Cada módulo tiene ejercicios prácticos con debrief de la IA.' },
      { text: 'SafetyGuard: si un ejercicio detecta riesgo, se adapta automáticamente.' },
      { text: 'Al completar módulos, avanzas en tu fase de transformación.' },
    ],
  },
  {
    id: 'settings',
    icon: Bell,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    title: '6. Configuración',
    subtitle: 'Personaliza tu experiencia',
    features: [
      { icon: Sparkles, label: 'Tono del coach', desc: 'Elige entre Directo, Socrático o Cálido.' },
      { icon: Bell, label: 'Notificaciones', desc: 'Configura recordatorios diarios, resumen semanal, hora y zona horaria.' },
      { icon: Download, label: 'Exportar datos', desc: 'Descarga tu historial en CSV o todos tus datos en JSON (RGPD).' },
      { icon: Shield, label: 'Seguridad', desc: 'Cambia tu contraseña y gestiona tu cuenta.' },
    ],
  },
];

export default function GuiaPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold">
            Guía de{' '}
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              usuario
            </span>
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed max-w-xl mx-auto">
            Todo lo que necesitas saber para sacarle el máximo partido a Tres Mil Millones de Latidos.
            De principio a fin, paso a paso.
          </p>

          {/* Quick nav */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all"
              >
                {s.title.split('. ')[1]}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 pb-20 space-y-16">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-11 h-11 rounded-xl ${section.bg} border ${section.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  <p className="text-sm text-zinc-400 mt-1">{section.subtitle}</p>
                </div>
              </div>

              {/* Steps variant */}
              {'steps' in section && section.steps && (
                <div className="space-y-3 ml-14">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-zinc-400">{i + 1}</span>
                      </span>
                      <div>
                        <p className="text-sm text-zinc-300 leading-relaxed">{step.text}</p>
                        {'link' in step && step.link && (
                          <Link
                            href={step.link}
                            className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-violet-400 hover:text-violet-300"
                          >
                            {step.linkText} <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Features variant */}
              {'features' in section && section.features && (
                <div className="grid sm:grid-cols-2 gap-3 ml-14">
                  {section.features.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <div key={f.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FIcon className={`w-4 h-4 ${section.color}`} />
                          <p className="text-sm font-semibold text-white">{f.label}</p>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {[
              { q: '¿La IA sustituye a un psicólogo?', a: 'No. Tres Mil Millones de Latidos es una herramienta de coaching y autoconocimiento. No diagnostica, no prescribe y no sustituye terapia profesional. En caso de crisis, te conecta con líneas de emergencia (024, 112).' },
              { q: '¿Mis datos son privados?', a: 'Sí. Tus conversaciones son tuyas. El sistema cumple con el RGPD europeo. Puedes exportar o eliminar todos tus datos desde Configuración en cualquier momento.' },
              { q: '¿Qué diferencia hay entre Free y Pro?', a: 'Free: 5 mensajes/día con IA rápida (Haiku). Pro (9€/mes): mensajes ilimitados con IA avanzada (Sonnet), historial completo y soporte prioritario.' },
              { q: '¿Puedo usar la voz en vez de escribir?', a: 'Sí. Pulsa el icono del micrófono junto al cuadro de texto. Tu navegador transcribirá tu voz a texto automáticamente. Funciona en Chrome, Edge y Safari.' },
              { q: '¿Qué es el "Action Lock"?', a: 'Cuando tienes una acción pendiente, el mentor no te deja cambiar de tema hasta que la cierres o la enfrentes. Es el mecanismo anti-procrastinación del sistema.' },
              { q: '¿Puedo conectar Telegram?', a: 'Sí. Ve a Configuración > Telegram. Podrás chatear con tu mentor y recibir recordatorios directamente en Telegram.' },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-zinc-800 bg-zinc-900/50">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-white">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
          >
            Empezar ahora <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
