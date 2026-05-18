"use client";

/**
 * Botón 🔖 "Marcar para volver luego" en cada respuesta del mentor.
 *
 * Filosofía: en momentos difíciles a veces algo te llega pero no puedes
 * procesarlo entonces. El usuario marca el mensaje y puede volver más
 * tarde desde el modal "Guardados" de la barra del chat.
 *
 * Solo aparece en mensajes del mentor (role=assistant) y solo si hay
 * messageId real (los mocks de demo no tienen).
 *
 * Estado:
 *  - idle      → bookmark vacío (gris)
 *  - saving    → loader brief mientras va el POST
 *  - bookmarked → bookmark relleno (índigo)
 *  - error     → roja brevemente y vuelve a idle
 *
 * Click idempotente: si está marked, lo quita; si no, lo añade.
 */

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useBookmarks } from "@/lib/useBookmarks";

type Props = {
  messageId: string;
  className?: string;
};

type State = "idle" | "saving" | "error";

export function BookmarkButton({ messageId, className }: Props) {
  const t = useTranslations("bookmarks");
  const { bookmarkedIds, refresh, toggle } = useBookmarks();
  const [state, setState] = useState<State>("idle");
  const [bookmarked, setBookmarked] = useState(false);

  // Sincronizar con el set global cuando cambie (otro botón pudo borrar/añadir).
  useEffect(() => {
    setBookmarked(bookmarkedIds.has(messageId));
  }, [bookmarkedIds, messageId]);

  const handleClick = useCallback(async () => {
    if (state === "saving") return;
    setState("saving");
    const optimistic = !bookmarked;
    setBookmarked(optimistic);
    try {
      const ok = await toggle(messageId, optimistic);
      if (!ok) throw new Error("toggle failed");
      setState("idle");
      void refresh();
    } catch {
      setBookmarked(!optimistic);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }, [bookmarked, messageId, state, toggle, refresh]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? t("removeAria") : t("addAria")}
      title={bookmarked ? t("removeTooltip") : t("addTooltip")}
      className={className ?? "p-2"}
    >
      {state === "saving" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
      ) : bookmarked ? (
        <BookmarkCheck className={`h-3.5 w-3.5 ${state === "error" ? "text-red-400" : "text-indigo-400"}`} />
      ) : (
        <Bookmark className={`h-3.5 w-3.5 ${state === "error" ? "text-red-400" : "text-zinc-600 hover:text-zinc-400"}`} />
      )}
    </button>
  );
}
