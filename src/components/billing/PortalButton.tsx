'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Error al abrir el portal');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal.');
      setLoading(false);
    }
  }

  return (
    <div className="inline-block space-y-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors disabled:opacity-60 flex items-center gap-1.5"
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Gestionar suscripción →
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
