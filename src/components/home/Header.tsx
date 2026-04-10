"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import ClinicalDisclaimer from "@/components/ClinicalDisclaimer";

const NAV = [
  { label: "Chat", href: "/app" },
  { label: "Guía", href: "/guia" },
  { label: "Precios", href: "/precios" },
  { label: "Mis Latidos", href: "/calculadora-latidos", highlight: true },
  { label: "Test gratuito", href: "/test", highlight: true },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl leading-none">💓</span>
            <span className="text-sm font-bold bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Tres Mil Millones<span className="hidden lg:inline"> de Latidos</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Navegacion principal" className="hidden md:flex items-center gap-1 flex-1">
            {NAV.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              if (link.highlight) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-cyan-500/40 bg-cyan-500/8 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/60 transition-all"
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "text-white bg-white/8"
                      : "text-zinc-300 hover:text-white hover:bg-white/6"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <ClinicalDisclaimer />
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-sm shadow-fuchsia-500/20"
            >
              Crear cuenta
            </Link>
          </div>

          {/* Mobile: CTA visible + toggle */}
          <div className="md:hidden flex items-center gap-2">
            <ClinicalDisclaimer />
            <Link
              href="/signup"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-all"
            >
              Crear cuenta
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-zinc-300 hover:text-white hover:bg-white/8 transition-colors"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-white/8 bg-background/98">
          <nav aria-label="Navegacion movil" className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "text-white bg-white/8"
                      : "text-zinc-300 hover:text-white hover:bg-white/6"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-3 border-t border-white/8 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="py-2.5 rounded-xl text-center text-sm font-medium text-zinc-300 border border-white/12 hover:text-white hover:border-white/20 transition-all"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="py-2.5 rounded-xl text-center text-sm font-semibold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
              >
                Crear cuenta
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
