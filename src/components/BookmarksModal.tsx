"use client";

/**
 * Pill "Guardados (N)" + modal con la lista.
 *
 * - Pill solo se renderiza si count > 0 (no spamear cuando el usuario
 *   acaba de empezar y no tiene nada guardado).
 * - Modal muestra cada bookmark con: snippet del mensaje, fecha,
 *   título de la conversación y botón "quitar".
 * - Si el usuario quita todos, la pill desaparece tras cerrar el modal.
 *
 * NO incluye scroll a la conversación original — limitación intencional
 * inicial. Los mensajes guardados son material para releer aquí; ir al
 * thread original requeriría navegación + persistencia de scroll target,
 * que justifica otra iteración.
 */

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Bookmark, X, Trash2 } from "lucide-react";
import { useBookmarks } from "@/lib/useBookmarks";

export function BookmarksTrigger() {
  const t = useTranslations("bookmarks");
  const { count } = useBookmarks();
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("listAria", { n: count })}
        title={t("listTooltip", { n: count })}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-950/40 border border-indigo-700/40 text-indigo-300 hover:bg-indigo-900/50 hover:border-indigo-600/60 transition-colors"
      >
        <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t("listLabel", { n: count })}</span>
      </button>

      {open ? <BookmarksModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function BookmarksModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("bookmarks");
  const locale = useLocale();
  const { bookmarks, remove } = useBookmarks();

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale, {
        dateStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("modalTitle")}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full max-h-[80vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-white">{t("modalTitle")}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {bookmarks.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">{t("empty")}</p>
          ) : (
            bookmarks.map((b) => (
              <article
                key={b.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <header className="flex items-center justify-between mb-2 gap-2">
                  <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    {formatDate(b.createdAt)}
                    {b.message.conversationTitle ? ` · ${b.message.conversationTitle}` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(b.id)}
                    aria-label={t("removeOneAria")}
                    title={t("removeOneTooltip")}
                    className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </header>
                <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {b.message.content || <em className="text-zinc-600">{t("emptyContent")}</em>}
                </p>
                {b.note ? (
                  <p className="mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-500 italic">
                    {b.note}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>

        <footer className="shrink-0 px-6 py-3 border-t border-zinc-800 text-[10px] text-zinc-600 leading-relaxed">
          {t("disclosure")}
        </footer>
      </div>
    </div>
  );
}
