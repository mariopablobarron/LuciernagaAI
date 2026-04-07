"use client";

export default function ImpulsoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <h2 className="text-lg font-semibold text-white">
          Algo salio mal al cargar esta seccion
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {error.message || "Error inesperado. Intenta de nuevo."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
