'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!sessionId) {
      router.replace('/app');
      return;
    }
    // Auto-redirect after 5s
    const timer = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timer);
          router.push('/app');
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl scale-150" />
            <div className="relative w-20 h-20 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-violet-400" />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Pago confirmado
          </p>
          <h1 className="text-3xl font-bold">Eres Pro ahora</h1>
          <p className="text-zinc-400 leading-relaxed">
            Tus 7 días de prueba empiezan hoy. Sin cargos hasta que terminen.
            Cancelas cuando quieras.
          </p>
        </div>

        {/* Features unlocked */}
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 p-5 text-left space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
            Desbloqueado
          </p>
          {[
            'Conversaciones y mensajes ilimitados',
            'Modo Impulso — programa de 21 días',
            'Retos personalizados a tu perfil',
            'Diagnósticos avanzados de estado',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-sm text-zinc-300">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/app"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20"
          >
            Empezar ahora <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-zinc-600">
            Redirigiendo automáticamente en {countdown}s…
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
