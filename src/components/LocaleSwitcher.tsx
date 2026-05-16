"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Locales soportados con metadata para UI.
 * El orden aquí es el orden visual en el dropdown.
 */
const LOCALES = [
  { code: "es", label: "ES", flag: "🇪🇸", name: "Español" },
  { code: "en", label: "EN", flag: "🇬🇧", name: "English" },
  { code: "pt", label: "PT", flag: "🇵🇹", name: "Português" },
  { code: "fr", label: "FR", flag: "🇫🇷", name: "Français" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

/**
 * Calcula la URL destino al cambiar de locale.
 *
 * Estrategia: la mayoría de páginas viven fuera del segmento [locale] y
 * leen el locale activo de la cookie NEXT_LOCALE (gestionado en
 * src/i18n/request.ts). Solo la landing (/, /en, /es, /pt, /fr) usa el
 * prefijo URL para locale. Para todo lo demás, basta con quedarse en la
 * misma URL y dejar que el cambio de cookie + router.refresh() recargue
 * la página con el nuevo locale.
 *
 * Reglas:
 *   - Si estamos en la landing ("/" o "/<locale>"), devolvemos la URL
 *     correspondiente al nuevo locale ("/" para es, "/<locale>" resto).
 *   - Si estamos en cualquier otra página, devolvemos la misma URL.
 */
function targetUrl(pathname: string, other: LocaleCode): string {
  const isLanding =
    pathname === "/" ||
    pathname === "/es" ||
    pathname === "/en" ||
    pathname === "/pt" ||
    pathname === "/fr";

  if (isLanding) {
    return other === "es" ? "/" : `/${other}`;
  }
  return pathname;
}

type Props = {
  className?: string;
  onNavigate?: () => void;
};

export default function LocaleSwitcher({ className, onNavigate }: Props) {
  const pathname = usePathname() || "/";
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLocale = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  // Cerrar al click fuera o al pulsar Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectLocale(code: LocaleCode) {
    if (code === locale) {
      setOpen(false);
      return;
    }
    // Persistir locale en cookie (1 año). Esto es lo que lee
    // src/i18n/request.ts para todas las páginas fuera de [locale].
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${oneYear}; samesite=lax`;

    // Si el usuario está autenticado, persistimos también User.locale en BD
    // para que los emails programados (nudges, weekly letter, family invites)
    // usen el idioma elegido. Fire-and-forget: no bloqueamos navegación.
    // Anonymous users: el endpoint devuelve persisted: false sin error.
    void fetch("/api/user/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: code }),
      credentials: "include",
    }).catch(() => { /* Best effort */ });

    const dest = targetUrl(pathname, code);
    setOpen(false);
    onNavigate?.();

    startTransition(() => {
      if (dest !== pathname) {
        router.push(dest);
      }
      // Refresh fuerza re-render con el nuevo locale (lee cookie).
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Idioma actual: ${currentLocale.name}. Cambiar.`}
        className={
          className ??
          "px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all flex items-center gap-1.5"
        }
      >
        <span aria-hidden>{currentLocale.flag}</span>
        <span>{currentLocale.label}</span>
        <svg
          aria-hidden
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1.5 min-w-[160px] py-1 rounded-lg bg-zinc-900 border border-zinc-700/60 shadow-lg shadow-black/40 z-50"
        >
          {LOCALES.map((l) => {
            const isCurrent = l.code === locale;
            return (
              <li key={l.code} role="option" aria-selected={isCurrent}>
                <button
                  type="button"
                  onClick={() => selectLocale(l.code)}
                  lang={l.code}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs ${
                    isCurrent
                      ? "text-violet-300 bg-violet-500/10"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                  } transition-colors`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {l.flag}
                  </span>
                  <span className="flex-1 text-left">{l.name}</span>
                  <span className="text-[10px] text-zinc-500">{l.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
