'use client';

import Link from 'next/link';
import {
  ArrowRight, MessageCircle, Target, Brain, Flame, BookOpen,
  BarChart3, Shield, Download, Bell, Sparkles, ChevronRight,
  Heart, CheckCircle2, Map, PenLine, Users, Wind,
} from 'lucide-react';

type Step = { text: string; link?: string; linkText?: string };
type Feature = { icon: typeof Sparkles; label: string; desc: string };
type Section = {
  id: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
  border: string;
  title: string;
  subtitle: string;
  steps?: Step[];
  features?: Feature[];
};

const SECTIONS: Section[] = [
  {
    id: 'start',
    icon: Sparkles,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    title: '1. Tu primer latido',
    subtitle: 'Empieza en menos de 60 segundos',
    steps: [
      { text: 'Entra en el chat desde la app.', link: '/app', linkText: 'Ir al chat' },
      { text: 'Escribe lo que te pasa, sin filtros. No hay respuesta correcta.' },
      { text: 'El mentor detecta tu estado emocional y adapta la conversacion.' },
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
    subtitle: 'No es un chatbot generico. Es un sistema que te conoce.',
    features: [
      { icon: Brain, label: 'Deteccion emocional', desc: 'Identifica si estas bloqueado, ansioso, en duda o con claridad, y adapta su respuesta.' },
      { icon: Target, label: 'Metas y acciones', desc: 'Cuando expresas una intencion, el sistema crea una meta con acciones concretas de 10 minutos.' },
      { icon: Sparkles, label: 'Microacciones', desc: 'Cada conversacion termina con algo que puedes hacer HOY. Pasos tan pequenos que no puedes decir que no.' },
      { icon: BookOpen, label: 'Historial completo', desc: 'Todas las conversaciones se guardan. El mentor recuerda tu historia para dar continuidad.' },
    ],
  },
  {
    id: 'checkin',
    icon: Heart,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    title: '3. Check-in diario',
    subtitle: 'Registra como te sientes en 30 segundos',
    steps: [
      { text: 'Abre la pestana Check-in desde el workspace o usa el bot de Telegram.' },
      { text: 'Registra tu estado emocional del dia.' },
      { text: 'Acumula rachas: cuantos dias seguidos llevas registrandote.' },
      { text: 'Con el tiempo, veras patrones: que dias son mas dificiles, que situaciones te afectan.' },
    ],
  },
  {
    id: 'diario',
    icon: PenLine,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    title: '4. Diario personal',
    subtitle: 'Un espacio privado para escribir sin que nadie responda',
    features: [
      { icon: PenLine, label: 'Escritura libre', desc: 'Reflexiones, desahogos, ideas, gratitud. Sin estructura obligatoria.' },
      { icon: Heart, label: 'Estado de animo', desc: 'Etiqueta cada entrada: genial, bien, neutral, mal o terrible.' },
      { icon: Target, label: 'Etiquetas', desc: 'Organiza tus entradas con etiquetas emocionales.' },
    ],
  },
  {
    id: 'metas',
    icon: Target,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    title: '5. Metas y progreso',
    subtitle: 'Convierte intenciones en acciones ejecutables',
    features: [
      { icon: Target, label: 'Meta concreta', desc: 'No "mejorar mi vida", sino "tener una conversacion honesta con mi jefe".' },
      { icon: CheckCircle2, label: 'Acciones vinculadas', desc: 'Cada meta tiene pasos de 5-15 minutos que puedes completar y marcar.' },
      { icon: Flame, label: 'Racha y progreso', desc: 'Dias consecutivos de actividad. Barra de progreso en la barra lateral.' },
      { icon: BarChart3, label: 'Patrones de evitacion', desc: 'El sistema detecta que pospones o rechazas y te lo muestra.' },
    ],
  },
  {
    id: 'respirar',
    icon: Wind,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    title: '6. Ejercicios de respiracion',
    subtitle: 'Calma la ansiedad en 2 minutos',
    features: [
      { icon: Wind, label: 'Respiracion 4-7-8', desc: 'Inhala 4s, reten 7s, exhala 8s. Ideal para calmar ansiedad.' },
      { icon: Heart, label: 'Respiracion cuadrada', desc: 'Inhala 4s, reten 4s, exhala 4s, reten 4s. Para centrarte.' },
    ],
  },
  {
    id: 'comunidad',
    icon: Users,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    title: '7. Comunidad',
    subtitle: 'No estas solo en el proceso',
    features: [
      { icon: Users, label: 'Posts anonimos', desc: 'Comparte reflexiones y avances sin que nadie sepa quien eres.' },
      { icon: Heart, label: 'Apoyo mutuo', desc: 'Dale "Me gusta" a los posts que te resuenen.' },
      { icon: Target, label: 'Por fases', desc: 'Los posts se organizan segun la fase del proceso en la que estas.' },
    ],
  },
  {
    id: 'journeys',
    icon: Map,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    title: '8. Viajes guiados',
    subtitle: 'Programas estructurados paso a paso',
    steps: [
      { text: 'Elige un viaje segun tu fase: autoconocimiento, gestion emocional, proposito o accion.' },
      { text: 'Cada modulo tiene ejercicios practicos con guia del mentor.' },
      { text: 'Tu progreso se rastrea y puedes retomar donde lo dejaste.' },
      { text: 'Al completar modulos, avanzas en tu fase de transformacion.' },
    ],
  },
  {
    id: 'settings',
    icon: Bell,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    title: '9. Configuracion',
    subtitle: 'Personaliza tu experiencia',
    features: [
      { icon: Sparkles, label: 'Tono del mentor', desc: 'Elige entre Directo, Socratico o Calido.' },
      { icon: Bell, label: 'Recordatorios', desc: 'Check-ins diarios, acciones pendientes y resumen semanal.' },
      { icon: Download, label: 'Exportar datos', desc: 'Descarga tu historial en CSV o todos tus datos en JSON (RGPD).' },
      { icon: Shield, label: 'Privacidad', desc: 'Cambia contrasena, gestiona consentimiento y elimina tu cuenta.' },
    ],
  },
];

const FAQ = [
  { q: 'La IA sustituye a un psicologo?', a: 'No. Tres Mil Millones de Latidos es una herramienta de coaching y autoconocimiento. No diagnostica, no prescribe y no sustituye terapia profesional. En caso de crisis, te conecta con lineas de emergencia (024, 112).' },
  { q: 'Mis datos son privados?', a: 'Si. Tus conversaciones son tuyas. El sistema cumple con el RGPD europeo. Puedes exportar o eliminar todos tus datos desde Ajustes en cualquier momento.' },
  { q: 'Que diferencia hay entre Free y Pro?', a: 'Free: 10 conversaciones/mes, 20 mensajes por conversacion. Pro (9 EUR/mes): conversaciones y mensajes ilimitados, Modo Impulso, bot de Telegram, portal familiar e insights avanzados. Ahora mismo todo es gratis durante el MVP.' },
  { q: 'Puedo usar Telegram?', a: 'Si. Ve a Ajustes > Telegram. Podras chatear con tu mentor y recibir recordatorios directamente en Telegram.' },
  { q: 'Que es el Modo Impulso?', a: 'Un programa intensivo de 21 dias con diagnostico, retos personalizados diarios, check-ins y analisis de comportamiento. Disponible en plan Pro (gratis durante el MVP).' },
  { q: 'Cuanto cuesta?', a: 'Ahora mismo todo es gratis. Estamos en fase MVP hasta octubre de 2026. Despues habra un plan Free (10 conv/mes) y un Pro (9 EUR/mes). Los primeros usuarios tendran condiciones especiales.' },
];

export default function GuiaPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold">
            Guia de{' '}
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              usuario
            </span>
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed max-w-xl mx-auto">
            Todo lo que necesitas saber para sacarle el maximo partido a Tres Mil Millones de Latidos.
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
              {section.steps && (
                <div className="space-y-3 ml-14">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-zinc-400">{i + 1}</span>
                      </span>
                      <div>
                        <p className="text-sm text-zinc-300 leading-relaxed">{step.text}</p>
                        {step.link && (
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
              {section.features && (
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
            {FAQ.map((faq, i) => (
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
    </>
  );
}
