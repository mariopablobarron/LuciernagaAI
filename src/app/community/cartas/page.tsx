"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, Mail } from "lucide-react";

type Letter = {
  id: string;
  reason: string;
  body: string;
  generatedAt: string;
  circleName: string;
  matchPattern: string;
  matchEmotion: string;
};

const REASON_LABELS: Record<string, string> = {
  cycle_end: "Cierre de ciclo",
  drift: "Cambio de fase",
  left: "Saliste del círculo",
  removed: "Removido del círculo",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CartasArchivadasPage() {
  const [letters, setLetters] = useState<Letter[] | null>(null);

  useEffect(() => {
    fetch("/api/community/circle/closing-letters", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { letters: Letter[] } | null) => setLetters(d?.letters ?? []))
      .catch(() => setLetters([]));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Comunidad
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Cartas del círculo</h1>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Cada vez que un círculo se cierra contigo dentro, se guarda una carta. Esto es lo que ha quedado registrado de tus pasos por la comunidad.
        </p>
      </header>

      {letters === null ? (
        <p className="text-sm text-zinc-500">Cargando...</p>
      ) : letters.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-2">
          <Mail className="h-6 w-6 text-zinc-500 mx-auto" />
          <p className="text-sm text-zinc-300">Aún no tienes cartas archivadas.</p>
          <p className="text-xs text-zinc-500">Aparecerán aquí cuando termine tu primer ciclo de círculo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {letters.map((l) => (
            <article key={l.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{l.circleName}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {l.matchEmotion} · {l.matchPattern}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-semibold rounded-full bg-zinc-800 text-zinc-300 px-2 py-1 shrink-0">
                  {REASON_LABELS[l.reason] ?? l.reason}
                </span>
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{l.body}</p>
              <p className="text-[11px] text-zinc-600">{formatDate(l.generatedAt)}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
