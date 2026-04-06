import React from "react";

export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 w-full max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* ── Esqueleto de la Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-2.5">
          <div className="h-8 w-56 bg-zinc-800/60 rounded-md animate-pulse" />
          <div className="h-4 w-72 bg-zinc-800/40 rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-zinc-800/60 rounded-lg animate-pulse" />
      </div>

      {/* ── Esqueleto de las Tarjetas de Métricas (Dashboard) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 border border-zinc-800 bg-zinc-900/50 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-zinc-800/60 rounded animate-pulse" />
              <div className="h-8 w-8 bg-zinc-800/40 rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-zinc-800/80 rounded animate-pulse" />
            <div className="h-3 w-32 bg-zinc-800/40 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* ── Esqueleto de la Tabla de Datos (Usuarios/Listados) ── */}
      <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden mt-8">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="h-5 w-40 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-zinc-800/50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="space-y-2.5 w-full max-w-sm">
                <div className="h-4 w-full bg-zinc-800/60 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-zinc-800/40 rounded animate-pulse" />
              </div>
              <div className="hidden sm:flex items-center gap-4 w-full justify-end">
                <div className="h-6 w-20 bg-zinc-800/50 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
