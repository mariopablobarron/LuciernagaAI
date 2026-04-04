'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RetosPage() {
  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/impulso" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className="card-surface p-12 text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Mis Retos</h1>
          <p className="text-zinc-400">Gestiona tus retos personalizados del programa Impulso</p>
        </div>
      </div>
    </div>
  );
}
