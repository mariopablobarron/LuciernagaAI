"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

function buildOtherLocaleHref(pathname: string, current: string, other: string): string {
  // Strip current locale prefix when present (e.g. "/en/faq" → "/faq").
  const stripped =
    pathname.replace(new RegExp(`^/${current}(?=/|$)`), "") || "/";
  // Default locale ("es") has no prefix; other locales get prefixed.
  if (other === "es") return stripped;
  const prefixed = `/${other}${stripped}`;
  return prefixed.replace(/\/$/, "") || `/${other}`;
}

type Props = {
  className?: string;
  onNavigate?: () => void;
};

export default function LocaleSwitcher({ className, onNavigate }: Props) {
  const pathname = usePathname() || "/";
  const locale = useLocale();
  const other = locale === "es" ? "en" : "es";
  const href = buildOtherLocaleHref(pathname, locale, other);
  const label = other === "en" ? "EN" : "ES";
  const aria = other === "en" ? "Switch language to English" : "Cambiar idioma a español";

  return (
    <Link
      href={href}
      hrefLang={other}
      aria-label={aria}
      onClick={onNavigate}
      className={
        className ??
        "px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all"
      }
    >
      {label}
    </Link>
  );
}
