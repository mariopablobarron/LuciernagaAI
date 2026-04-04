import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import CheckoutButton from '@/components/CheckoutButton';
import PortalButton from '@/components/billing/PortalButton';

export const metadata: Metadata = {
  title: 'Precios — Luciérnaga AI',
  description: 'Plan gratuito para empezar. Pro con conversaciones ilimitadas, Modo Impulso y retos personalizados por 9€/mes.',
  openGraph: {
    title: 'Precios — Luciérnaga AI',
    description: 'Empieza gratis. Actualiza cuando necesites más.',
    type: 'website',
    locale: 'es_ES',
  },
  robots: { index: true, follow: true },
};

const FREE_FEATURES = [
  '10 conversaciones al mes',
  'Hasta 20 mensajes por conversación',
  'Test de diagnóstico gratuito',
  'Acceso al coach IA',
];

const PRO_FEATURES = [
  'Conversaciones ilimitadas',
  'Mensajes ilimitados',
  'Modo Impulso completo — 21 días',
  'Historial de conversaciones',
  'Diagnósticos avanzados',
  'Retos personalizados',
  'Insights semanales',
  'Soporte prioritario',
];

export default function PreciosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Precios</p>
        <h1 className="text-4xl font-bold">Simple y transparente</h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Empieza gratis. Actualiza cuando necesites más.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-6">
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-1">Gratis</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">0€</span>
              <span className="text-zinc-500">/mes</span>
            </div>
          </div>
          <ul className="space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-zinc-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/app"
            className="block text-center py-3 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-all"
          >
            Empezar gratis
          </Link>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border-2 border-violet-500/60 bg-violet-500/5 p-8 space-y-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              MÁS POPULAR
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-violet-400 mb-1">Pro</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">9€</span>
              <span className="text-zinc-500">/mes</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">o 79€/año — ahorras 2 meses</p>
          </div>
          <ul className="space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-violet-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <CheckoutButton plan="pro_monthly">Empezar 7 días gratis</CheckoutButton>
            <CheckoutButton
              plan="pro_annual"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Plan anual — 79€/año
            </CheckoutButton>
          </div>
          <p className="text-xs text-zinc-600 text-center">
            7 días de prueba gratis · Sin cargo hasta el día 8 · Cancelas cuando quieras
          </p>
        </div>
      </div>

      {/* Portal link for existing subscribers */}
      <div className="text-center">
        <p className="text-sm text-zinc-500 mb-2">¿Ya eres Pro?</p>
        <PortalButton />
      </div>

      {/* FAQ */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-center mb-6">Preguntas frecuentes</h2>
        {[
          {
            q: '¿Necesito tarjeta para el plan gratuito?',
            a: 'No. El plan gratuito no requiere ningún dato de pago.',
          },
          {
            q: '¿Puedo cancelar cuando quiera?',
            a: 'Sí. Cancelas en cualquier momento sin permanencia ni penalización. Si cancelas durante el periodo de prueba, no se te cobra nada.',
          },
          {
            q: '¿Qué pasa cuando termina el periodo de prueba?',
            a: 'Al día 8 se carga el primer mes (9€). Recibirás un email de Stripe antes del cargo.',
          },
          {
            q: '¿Luciérnaga reemplaza a un psicólogo?',
            a: 'No. Luciérnaga es una herramienta de mentoría conversacional. No sustituye terapia profesional.',
          },
        ].map(({ q, a }) => (
          <div key={q} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="font-semibold text-white text-sm mb-2">{q}</p>
            <p className="text-sm text-zinc-400">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
