import type { ReactNode } from "react";
import Link from "next/link";

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <div className="border-b border-zinc-800/60 px-4 py-2 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors">
          <span className="text-sm leading-none">💓</span>
          <span className="text-xs font-semibold bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            Latidos
          </span>
        </Link>
        <span className="text-zinc-700 text-xs">/</span>
        <span className="text-xs text-zinc-500">Organizaciones</span>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
