'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

type Props = {
  interval: 'monthly' | 'annual';
  label: string;
  variant?: 'primary' | 'secondary';
};

export default function CheckoutButton({ interval, label, variant = 'primary' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Error al iniciar el pago');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal. Inténtalo de nuevo.');
      setLoading(false);
    }
  }

  const base =
    variant === 'primary'
      ? 'w-full py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-60'
      : 'w-full py-2.5 rounded-xl text-sm font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60';

  return (
    <div className="space-y-2">
      <button onClick={handleClick} disabled={loading} className={base}>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {label}
            {variant === 'primary' && <ArrowRight className="w-4 h-4" />}
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
