"use client";

/**
 * Menú "···" que agrupa las herramientas ocasionales del chat.
 *
 * Contexto: la barra encima del input acumuló 6 pills (Demasiado mal,
 * Respirar, Mentor, Incógnito, Mis datos, Guardados). En móvil estrecho
 * se iban a 2 líneas y competían con el input.
 *
 * Reparto:
 *  - VISIBLES siempre (uso frecuente / críticas): Demasiado mal, Respirar,
 *    Mentor — se quedan en la barra, fuera de este componente.
 *  - DENTRO de este menú (uso ocasional): Incógnito, Mis datos, Guardados.
 *
 * Los tres internos abren modales `fixed inset-0` o son toggles directos,
 * así que funcionan igual dentro del panel desplegable.
 */

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { IncognitoToggle } from "@/components/IncognitoToggle";
import { DataSummaryButton } from "@/components/DataSummaryButton";
import { BookmarksTrigger } from "@/components/BookmarksModal";

export function ChatToolsMenu() {
  const t = useTranslations("chatToolsMenu");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
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
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("trigger")}
        title={t("trigger")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          open
            ? "bg-zinc-800 border border-zinc-600 text-zinc-200"
            : "bg-zinc-900/50 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/60"
        }`}
      >
        <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t("trigger")}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={t("trigger")}
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl p-2 z-50 flex flex-col items-stretch gap-1.5 min-w-[170px]"
        >
          {/* Cada herramienta mantiene su propia pill/toggle. Las envolvemos
              en filas centradas para una columna coherente. */}
          <div className="flex justify-center" role="none">
            <IncognitoToggle />
          </div>
          <div className="flex justify-center" role="none">
            <DataSummaryButton />
          </div>
          {/* BookmarksTrigger se auto-oculta si el usuario no tiene guardados. */}
          <div className="flex justify-center" role="none">
            <BookmarksTrigger />
          </div>
        </div>
      )}
    </div>
  );
}
