"use client";

export default function LoadingScreen({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-5">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500 border-r-fuchsia-500" />
        <span className="text-2xl">💓</span>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-zinc-300">{message}</p>
        <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
