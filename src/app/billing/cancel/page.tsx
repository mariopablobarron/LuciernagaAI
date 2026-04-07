import Link from 'next/link';
import { XCircle, ArrowRight, MessageSquare } from 'lucide-react';

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-zinc-500/20 rounded-full blur-xl scale-150" />
            <div className="relative w-20 h-20 rounded-full bg-zinc-800/60 border border-zinc-700 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Pago no completado
          </p>
          <h1 className="text-3xl font-bold">No has completado el pago</h1>
          <p className="text-zinc-400 leading-relaxed">
            Tu plan no ha cambiado. Puedes volver a intentarlo cuando quieras.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/precios"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20"
          >
            Volver a precios <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/app"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-sm font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Ir al chat
          </Link>
        </div>
      </div>
    </div>
  );
}
