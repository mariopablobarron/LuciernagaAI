"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

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
 * Construye la href para cambiar a otro locale preservando el resto del path.
 * El locale por defecto (es) NO lleva prefijo URL; los demás sí.
 *
 * Ejemplos:
 *   ("/", "es", "pt")        → "/pt"
 *   ("/en/faq", "en", "es")  → "/faq"
 *   ("/pt/precios", "pt", "fr") → "/fr/precios"
 */
function buildOtherLocaleHref(pathname: string, current: string, other: LocaleCode): string {
  // Quitar prefijo del locale actual si lo hay
  const stripped =
    current === "es"
      ? pathname || "/"
      : pathname.replace(new RegExp(`^/${current}(?=/|$)`), "") || "/";
  // El default (es) no lleva prefijo; los demás sí
  if (other === "es") return stripped;
  const prefixed = `/${other}${stripped === "/" ? "" : stripped}`;
  return prefixed || `/${other}`;
}

type Props = {
  className?: string;
  onNavigate?: () => void;
};

export default function LocaleSwitcher({ className, onNavigate }: Props) {
  const pathname = usePathname() || "/";
  const locale = useLocale();
  const [open, setOpen] = useState(false);
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
            const href = buildOtherLocaleHref(pathname, locale, l.code);
            return (
              <li key={l.code} role="option" aria-selected={isCurrent}>
                <Link
                  href={href}
                  hrefLang={l.code}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs ${
                    isCurrent
                      ? "text-violet-300 bg-violet-500/10"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                  } transition-colors`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {l.flag}
                  </span>
                  <span className="flex-1">{l.name}</span>
                  <span className="text-[10px] text-zinc-500">{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
