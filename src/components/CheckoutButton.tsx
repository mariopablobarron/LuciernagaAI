'use client';
import { useState } from 'react';
import { Zap } from 'lucide-react';

type Props = {
  plan?: 'pro_monthly' | 'pro_annual';
  email?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function CheckoutButton({ plan = 'pro_monthly', email, children, className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? 'Error al iniciar el pago');
    } catch {
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={className ?? 'flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-60 disabled:cursor-not-allowed'}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Redirigiendo...
        </span>
      ) : (
        children ?? <><Zap className="w-4 h-4" />Empezar 7 días gratis</>
      )}
    </button>
  );
}
