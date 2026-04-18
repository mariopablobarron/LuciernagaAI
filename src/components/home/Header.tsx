"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, Settings, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ClinicalDisclaimer from "@/components/ClinicalDisclaimer";
import NotificationBell from "@/components/NotificationBell";
import { useSession } from "@/lib/useSession";

const NAV = [
  { label: "Chat", href: "/app" },
  { label: "Método", href: "/como-funciona" },
  { label: "Comparativa", href: "/comparativa" },
  { label: "Precios", href: "/precios" },
  { label: "FAQ", href: "/faq" },
  { label: "Test gratuito", href: "/test", highlight: true },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    sessionStorage.removeItem("_session_user");
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

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

          {/* CTAs / User area */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <ClinicalDisclaimer />
            {!sessionLoading && user ? (
              <>
                <NotificationBell />
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/6 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300">
                      {initials || <User className="w-3.5 h-3.5" />}
                    </div>
                    <span className="max-w-[120px] truncate">{user.name || "Mi cuenta"}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-sm font-semibold text-white truncate">{user.name || "Usuario"}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/app" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/6 transition-colors">
                          <span className="text-base">💓</span> Chat
                        </Link>
                        <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/6 transition-colors">
                          <User className="w-4 h-4 text-zinc-500" /> Perfil
                        </Link>
                        <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/6 transition-colors">
                          <Settings className="w-4 h-4 text-zinc-500" /> Ajustes
                        </Link>
                      </div>
                      <div className="border-t border-zinc-800 py-1">
                        <button onClick={() => void handleLogout()} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">
                          <LogOut className="w-4 h-4" /> Cerrar sesion
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : !sessionLoading ? (
              <>
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
              </>
            ) : null}
          </div>

          {/* Mobile: CTA visible + toggle */}
          <div className="md:hidden flex items-center gap-2">
            <ClinicalDisclaimer />
            {!sessionLoading && user ? (
              <>
                <NotificationBell />
                <Link href="/app" className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300">
                  {initials || <User className="w-3.5 h-3.5" />}
                </Link>
              </>
            ) : !sessionLoading ? (
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-all"
              >
                Crear cuenta
              </Link>
            ) : null}
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
            <div className="pt-3 border-t border-white/8">
              {user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-500">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-[10px] font-bold text-violet-300">
                      {initials || <User className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{user.name || "Mi cuenta"}</span>
                  </div>
                  <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/6">
                    <User className="w-4 h-4 text-zinc-500" /> Perfil
                  </Link>
                  <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/6">
                    <Settings className="w-4 h-4 text-zinc-500" /> Ajustes
                  </Link>
                  <button onClick={() => { setOpen(false); void handleLogout(); }} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 w-full text-left">
                    <LogOut className="w-4 h-4" /> Cerrar sesion
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
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
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
