import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg text-center space-y-8">
        {/* Heartbeat animation */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-violet-500/30 bg-zinc-900/80">
            <span className="text-4xl">💓</span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <p className="text-7xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            404
          </p>
          <h1 className="text-xl font-bold text-white">
            Este latido no existe
          </h1>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            La pagina que buscas no se encuentra. Pero tu siguiente paso si.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
          >
            Volver al inicio
          </Link>
          <Link
            href="/app"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/50 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-violet-500/40 hover:text-white transition-all"
          >
            Ir al chat
          </Link>
        </div>

        {/* Footer text */}
        <p className="text-xs text-zinc-700">
          Tres Mil Millones de Latidos
        </p>
      </div>
    </main>
  );
}
