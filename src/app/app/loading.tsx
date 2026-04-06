import { Sparkles } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-1000">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/30">
          <div className="absolute inset-0 animate-spin rounded-full border-b-2 border-r-2 border-cyan-400/50"></div>
          <Sparkles className="h-6 w-6 text-cyan-400 animate-pulse" />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-sm font-medium text-zinc-200 tracking-widest uppercase">
            Cargando espacio
          </h2>
          <p className="text-xs text-zinc-500">Preparando entorno seguro...</p>
        </div>
      </div>
    </div>
  );
}
