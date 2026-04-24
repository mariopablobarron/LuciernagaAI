import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Gift, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Precios — Tres Mil Millones de Latidos',
  description: 'Tres Mil Millones de Latidos: acceso completo gratuito durante la fase MVP. Registrate y accede a mentoria con IA, check-ins, diario, Modo Impulso y mas. Sin tarjeta de credito.',
  alternates: {
    canonical: 'https://tresmilmillonesdelatidos.es/precios',
  },
  openGraph: {
    title: 'Precios — Tres Mil Millones de Latidos',
    description: 'Fase MVP: acceso Pro gratuito. Mentoria con IA, check-ins, diario y Modo Impulso. Sin coste.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Tres Mil Millones de Latidos',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Precios — Tres Mil Millones de Latidos' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Precios — Tres Mil Millones de Latidos',
    description: 'Mentoria con IA gratis durante el MVP. Sin tarjeta de credito.',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
};

const PRO_FEATURES = [
  'Conversaciones ilimitadas con el coach IA',
  'Mensajes ilimitados',
  'Modo Impulso completo — 21 dias de transformacion',
  'Diagnosticos avanzados y retos personalizados',
  'Insights semanales de comportamiento',
  'Check-in diario con racha',
  'Mapa de patrones de evitacion',
  'Historial de conversaciones completo',
  'Bot de Telegram integrado',
  'Portal para personas de confianza',
];

const FUTURE_PRICE = [
  { plan: 'Free', price: '0 euros/mes', features: 'Conversaciones sin limite con el mentor IA. Sin cap diario.' },
  { plan: 'Pro', price: '9 euros/mes', features: 'Continuidad cross-device, memoria persistente, Modo Impulso y prioridad' },
  { plan: 'Pro anual', price: '79 euros/año', features: 'Mismo que Pro, ahorrando 2 meses' },
];

export default function PreciosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">tresmilmillonesdelatidos.es</p>
        <h1 className="text-3xl sm:text-4xl font-bold">Acceso completo. Gratuito. Ahora.</h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Estamos en fase MVP. Los primeros usuarios acceden a todo el plan Pro
          sin coste hasta octubre 2026. Sin tarjeta. Sin compromiso.
        </p>
      </div>

      {/* MVP offer card */}
      <div className="rounded-2xl border-2 border-violet-500/60 bg-violet-500/5 p-8 sm:p-10 space-y-6 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
            FASE MVP — ACCESO ABIERTO
          </span>
        </div>

        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-3">
            <Gift className="w-6 h-6 text-violet-400" />
            <p className="text-sm font-medium text-violet-400">Plan Pro completo</p>
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black text-white">0 euros</span>
            <span className="text-zinc-500">/6 meses</span>
          </div>
          <p className="text-sm text-zinc-400">Sin tarjeta. Sin compromiso. Solo tu registro.</p>
        </div>

        <ul className="grid sm:grid-cols-2 gap-3 pt-2">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
              <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

        <div className="pt-4">
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-base"
          >
            Crear cuenta gratuita <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-zinc-600 text-center mt-3">
            Al registrarte accedes automaticamente al plan Pro completo.
            No se te pedira tarjeta de credito.
          </p>
        </div>
      </div>

      {/* Why free — honesty block */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🧪</span>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Por que es gratis (y hasta cuando)</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Tres Mil Millones de Latidos esta en fase de producto minimo viable.
              Funciona, pero todavia esta aprendiendo. Y para aprender necesita
              personas reales usandolo de verdad — no betas cerradas ni demos
              que nadie toca.
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Durante estos 6 meses (hasta octubre 2026), todo el plan Pro esta abierto
              sin coste. A cambio, tus interacciones nos ayudan a mejorar el producto.
              No vendemos tus datos. No los compartimos. Los usamos, anonimizados,
              para que la herramienta sea mejor para ti y para los que vengan despues.
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Cuando termine la fase MVP, el plan gratuito mantendra el chat
              sin limite. Pro sera para quien quiera continuidad cross-device,
              memoria persistente entre sesiones y Modo Impulso. Sin sorpresas.
            </p>
          </div>
        </div>
      </div>

      {/* Future pricing reference */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">Precios tras la fase MVP</h2>
        <p className="text-sm text-zinc-500 text-center max-w-md mx-auto">
          Estos seran los precios cuando termine el periodo de acceso abierto.
          Los usuarios MVP tendran condiciones especiales.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          {FUTURE_PRICE.map((p) => (
            <div key={p.plan} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
              <p className="text-sm font-semibold text-white">{p.plan}</p>
              <p className="text-lg font-bold text-violet-400">{p.price}</p>
              <p className="text-xs text-zinc-500">{p.features}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3 max-w-lg mx-auto">
          <p className="text-sm font-semibold text-white text-center">¿Por que existe el plan Pro?</p>
          <p className="text-xs text-zinc-400 leading-relaxed text-center">
            El cambio real no ocurre en una conversacion — ocurre cuando mantienes el hilo durante semanas.
            La continuidad es lo que transforma una idea en un habito. Pro existe para que no pierdas
            ese hilo: conversaciones ilimitadas, seguimiento de acciones, y un mentor que recuerda
            tu historia completa.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-center mb-6">Preguntas frecuentes</h2>
        {[
          {
            q: 'Es realmente gratis?',
            a: 'Si. Durante la fase MVP (hasta octubre 2026) no se cobra nada. No necesitas tarjeta de credito. Solo registrarte con tu email.',
          },
          {
            q: 'Que pasa con mis datos?',
            a: 'Tus conversaciones y datos emocionales se procesan de forma anonimizada para mejorar el producto. Nunca se venden ni comparten con terceros. Puedes borrar todo en cualquier momento desde Ajustes.',
          },
          {
            q: 'Que pasa cuando termine el MVP?',
            a: 'Podras seguir usando el plan gratuito con chat sin limite, o elegir Pro a su precio regular para extras (continuidad cross-device, memoria persistente, Modo Impulso). Los usuarios MVP tendran condiciones especiales.',
          },
          {
            q: 'Tres Mil Millones de Latidos reemplaza a un psicologo?',
            a: 'No. Es una herramienta de mentoria conversacional con IA. Ayuda a ordenar ideas y pasar a la accion, pero no sustituye terapia profesional. En caso de crisis, conecta con el 024.',
          },
          {
            q: 'Puedo usarlo desde el movil?',
            a: 'Si. La web esta optimizada para movil y puedes anadirla a tu pantalla de inicio. Tambien puedes usar el bot de Telegram para conversar directamente desde ahi.',
          },
        ].map(({ q, a }) => (
          <div key={q} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="font-semibold text-white text-sm mb-2">{q}</p>
            <p className="text-sm text-zinc-400">{a}</p>
          </div>
        ))}
      </div>

      {/* CTA bottom */}
      <div className="text-center pt-4">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-lg"
        >
          Empezar ahora — es gratis <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
