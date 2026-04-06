export default function AppLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
        </div>
        <p className="text-sm text-zinc-500">Cargando...</p>
      </div>
    </div>
  );
}
