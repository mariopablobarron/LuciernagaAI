"use client";

import { useTranslations } from "next-intl";
import { EyeOff, Eye } from "lucide-react";
import { useIncognitoMode } from "@/lib/useIncognitoMode";

/**
 * Toggle pill para activar/desactivar modo incógnito desde el chat.
 * Diseño: idéntico al EmergencyShelterTrigger para coherencia visual.
 *
 * Visible siempre encima del input (mismo sitio que el shelter trigger).
 */
export function IncognitoToggle({ className }: { className?: string }) {
  const t = useTranslations("incognito");
  const { enabled, toggle } = useIncognitoMode();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? t("tooltipOn") : t("tooltipOff")}
      className={
        className ??
        `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          enabled
            ? "bg-violet-950/50 border border-violet-600/50 text-violet-200 hover:bg-violet-900/60"
            : "bg-zinc-900/50 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/60"
        }`
      }
    >
      {enabled ? (
        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
      ) : (
        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      <span>{enabled ? t("activeLabel") : t("inactiveLabel")}</span>
    </button>
  );
}

/**
 * Banner que aparece cuando incógnito está ON. Va encima del chat,
 * pequeño pero presente — el usuario debe saber permanentemente que
 * está en este modo.
 */
export function IncognitoBanner() {
  const t = useTranslations("incognito");
  const { enabled } = useIncognitoMode();

  if (!enabled) return null;

  return (
    <div
      role="status"
      className="shrink-0 flex items-center justify-center gap-2 bg-violet-950/60 border-b border-violet-700/40 px-4 py-1.5"
    >
      <EyeOff className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
      <p className="text-xs text-violet-200 font-medium">{t("bannerText")}</p>
    </div>
  );
}
