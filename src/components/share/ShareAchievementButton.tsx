"use client";

import { Share2, Check, Copy } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

type Kind = "action_completed" | "insight" | "streak";

type Props = {
  title: string;
  kind: Kind;
  subtitle?: string;
  variant?: "primary" | "ghost";
  className?: string;
};

// Botón "Compartir mi avance" — usa Web Share API en mobile (sheet nativo
// con WhatsApp/Telegram/Twitter/etc.) y fallback a copia al portapapeles
// con feedback visual en desktop. La URL compartida es /share?... que
// renderiza meta og:image dinámica desde /api/og.
export function ShareAchievementButton({
  title,
  kind,
  subtitle,
  variant = "primary",
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);

  function buildShareUrl(): string {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://tresmilmillonesdelatidos.es";
    const params = new URLSearchParams({ title, kind });
    if (subtitle) params.set("subtitle", subtitle);
    return `${base}/share?${params.toString()}`;
  }

  async function handleShare() {
    const url = buildShareUrl();
    const shareText = title;
    trackEvent("share_achievement_clicked", { kind, has_native_share: typeof navigator !== "undefined" && !!navigator.share });

    // Web Share API (mobile, algunos desktops)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Tres Mil Millones de Latidos",
          text: shareText,
          url,
        });
        trackEvent("share_achievement_completed", { kind, method: "native" });
        return;
      } catch {
        // Usuario canceló o navegador bloqueó — caer a copy
      }
    }

    // Fallback: copiar URL al portapapeles
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent("share_achievement_completed", { kind, method: "clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Último fallback: prompt manual
      window.prompt("Copia este enlace para compartir:", url);
    }
  }

  const baseClasses =
    variant === "primary"
      ? "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all"
      : "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Compartir mi avance"
      className={`${baseClasses} ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Enlace copiado
        </>
      ) : (
        <>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <Share2 className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          Compartir mi avance
        </>
      )}
    </button>
  );
}
