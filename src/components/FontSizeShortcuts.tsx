"use client";

/**
 * Wrapper UI para useFontSizeShortcuts — escucha los atajos de teclado
 * Ctrl/Cmd+=/- y muestra un toast efímero con el nivel actual.
 *
 * Pensado para montar UNA sola vez en algún layout (root o app layout),
 * no en cada página. El hook a su vez es global.
 *
 * El toast es visual y no requiere acción del usuario — desaparece solo.
 */

import { useTranslations } from "next-intl";
import { useFontSizeShortcuts } from "@/lib/useFontSizeShortcuts";

export function FontSizeShortcuts() {
  const t = useTranslations("fontSizeShortcuts");
  const { toast } = useFontSizeShortcuts();

  if (!toast?.visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] rounded-full bg-zinc-900/95 border border-zinc-700 px-4 py-2 shadow-lg backdrop-blur-sm pointer-events-none"
    >
      <p className="text-sm font-medium text-zinc-100">
        {toast.level === 0
          ? t("levelDefault")
          : t("levelPlus", { n: toast.level })}
      </p>
    </div>
  );
}
