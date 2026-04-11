"use client";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-zinc-800/40 ${className ?? "h-32"}`}>
      <div className="absolute inset-0 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-800/40 ${className ?? "h-4 w-full"}`}>
      <div className="absolute inset-0 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />
    </div>
  );
}

export function SkeletonAvatar({ size = "h-10 w-10" }: { size?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-full bg-zinc-800/40 ${size}`}>
      <div className="absolute inset-0 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />
    </div>
  );
}
