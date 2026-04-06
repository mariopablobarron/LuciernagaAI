"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { SAAS_ADMIN_NAV, SAAS_CONFIG } from "@/lib/saas";

type AdminShellProps = {
  title: string;
  subtitle: string;
  onLogout: () => void | Promise<void>;
  showSectionNav?: boolean;
  children: ReactNode;
};

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Usuarios", matchPrefix: true },
  { href: "/admin-clinical", label: "Panel clínico", matchPrefix: true },
];

export function AdminShell({
  title,
  subtitle,
  onLogout,
  showSectionNav = true,
  children,
}: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="bg-zinc-950 px-4 py-6 md:px-6">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-1/4 top-0 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header card */}
        <div className="card-surface rounded-2xl border border-zinc-800 p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30">
                  <Sparkles className="h-3 w-3" />
                  SaaS Admin
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                  <ShieldCheck className="h-3 w-3" />
                  Acceso interno
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 md:text-base">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-stretch">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Producto
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{SAAS_CONFIG.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{SAAS_CONFIG.description}</p>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="my-5 h-px bg-zinc-800" />

          {/* Main nav */}
          <div className="flex flex-wrap gap-2">
            {NAV_LINKS.map((link) => {
              const active = link.matchPrefix
                ? pathname.startsWith(link.href)
                : pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Section nav */}
          {showSectionNav && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SAAS_ADMIN_NAV.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-full border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-500 transition-all hover:border-zinc-700 hover:text-zinc-300"
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
