'use client';
import Link from 'next/link';
import { Zap } from 'lucide-react';

type Props = {
  message?: string;
};

export default function UpgradeBanner({ message }: Props) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Zap className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-sm text-zinc-300">
          {message ?? 'Pro: continuidad cross-device, memoria persistente entre sesiones y Modo Impulso.'}
        </p>
      </div>
      <Link
        href="/precios"
        className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-all"
      >
        Ver planes
      </Link>
    </div>
  );
}
