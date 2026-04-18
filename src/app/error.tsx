"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[ERROR-BOUNDARY]", error.message);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg text-center space-y-8">
        <div className="relative mx-auto w-24 h-24">
          <div
            className="absolute inset-0 rounded-full bg-rose-500/10 animate-ping"
            style={{ animationDuration: "2s" }}
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-rose-500/30 bg-zinc-900/80">
            <span className="text-4xl">💔</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-400">Algo se ha roto</p>
          <h1 className="text-xl font-bold text-white">Se ha producido un error inesperado</h1>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            No es tu culpa. Lo hemos registrado y vamos a mirarlo. Mientras tanto, puedes reintentar
            o volver al inicio.
          </p>
          {error.digest && (
            <p className="pt-2 text-xs text-zinc-600">
              Código de referencia: <span className="font-mono text-zinc-500">{error.digest}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/50 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-violet-500/40 hover:text-white transition-all"
          >
            Volver al inicio
          </Link>
        </div>

        {isDev && (
          <details className="mt-6 text-left rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs">
            <summary className="cursor-pointer font-bold text-zinc-300">Debug (solo en dev)</summary>
            <pre className="mt-3 max-h-40 overflow-auto text-zinc-500 break-all whitespace-pre-wrap">
              {JSON.stringify(
                { message: error.message, digest: error.digest, stack: error.stack },
                null,
                2,
              )}
            </pre>
          </details>
        )}

        <p className="text-xs text-zinc-700">Tres Mil Millones de Latidos</p>
      </div>
    </main>
  );
}
