"use client";

/**
 * Hook compartido para gestión de bookmarks de mensajes del mentor.
 *
 * Provee:
 *  - bookmarkedIds: Set<string> con messageIds marcados (para que cada
 *    BookmarkButton sepa su estado actual sin refetch individual).
 *  - bookmarks: lista completa (para el modal de "Guardados").
 *  - count: número de bookmarks actuales.
 *  - refresh(): recarga la lista del servidor.
 *  - toggle(messageId, desiredState): añade/quita por messageId.
 *  - remove(bookmarkId): borra por id.
 *
 * Estrategia: estado en memoria del proveedor con fetch inicial lazy.
 * Sin polling. El usuario lo refresca cuando abre el modal o tras click.
 */

import { useState, useCallback, useEffect, useRef } from "react";

export type BookmarkRecord = {
  id: string;
  messageId: string;
  note: string | null;
  createdAt: string;
  message: {
    content: string;
    role: string;
    createdAt: string;
    conversationId: string;
    conversationTitle: string | null;
  };
};

type State = {
  loaded: boolean;
  bookmarks: BookmarkRecord[];
  bookmarkedIds: Set<string>;
};

// Singleton: queremos compartir estado entre múltiples instancias del hook
// en distintos componentes (botones individuales + modal). React context
// sería más limpio, pero requeriría provider wrapper en layout — overkill
// para este caso. Module-level state + listeners simples basta.

let cache: State = { loaded: false, bookmarks: [], bookmarkedIds: new Set() };
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

async function fetchAll(): Promise<BookmarkRecord[]> {
  const res = await fetch("/api/bookmarks", { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { bookmarks: BookmarkRecord[] };
  return data.bookmarks;
}

async function postBookmark(messageId: string): Promise<{ id: string }> {
  const res = await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { bookmark: { id: string } };
  return data.bookmark;
}

async function deleteBookmark(bookmarkId: string): Promise<void> {
  const res = await fetch(`/api/bookmarks/${bookmarkId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function useBookmarks() {
  const [, setTick] = useState(0);
  const mountedRef = useRef(true);

  // Subscribirse a cambios del cache.
  useEffect(() => {
    const listener = () => {
      if (mountedRef.current) setTick((t) => t + 1);
    };
    listeners.add(listener);
    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  // Fetch inicial (una vez para todo el proceso del cliente).
  useEffect(() => {
    if (cache.loaded) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    try {
      const bookmarks = await fetchAll();
      cache = {
        loaded: true,
        bookmarks,
        bookmarkedIds: new Set(bookmarks.map((b) => b.messageId)),
      };
      notify();
    } catch {
      // Mantener estado anterior. El hook expone error indirectamente
      // si bookmarks está vacío y loaded sigue false.
    }
  }, []);

  const toggle = useCallback(async (messageId: string, desiredState: boolean): Promise<boolean> => {
    try {
      if (desiredState) {
        // Add
        const bookmark = await postBookmark(messageId);
        cache = {
          ...cache,
          bookmarkedIds: new Set([...cache.bookmarkedIds, messageId]),
          bookmarks: [
            {
              id: bookmark.id,
              messageId,
              note: null,
              createdAt: new Date().toISOString(),
              message: {
                content: "",
                role: "assistant",
                createdAt: new Date().toISOString(),
                conversationId: "",
                conversationTitle: null,
              },
            },
            ...cache.bookmarks.filter((b) => b.messageId !== messageId),
          ],
        };
      } else {
        // Remove — busca el id en el cache.
        const existing = cache.bookmarks.find((b) => b.messageId === messageId);
        if (existing) {
          await deleteBookmark(existing.id);
          const nextIds = new Set(cache.bookmarkedIds);
          nextIds.delete(messageId);
          cache = {
            ...cache,
            bookmarkedIds: nextIds,
            bookmarks: cache.bookmarks.filter((b) => b.id !== existing.id),
          };
        }
      }
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const remove = useCallback(async (bookmarkId: string): Promise<boolean> => {
    try {
      await deleteBookmark(bookmarkId);
      const target = cache.bookmarks.find((b) => b.id === bookmarkId);
      if (target) {
        const nextIds = new Set(cache.bookmarkedIds);
        nextIds.delete(target.messageId);
        cache = {
          ...cache,
          bookmarkedIds: nextIds,
          bookmarks: cache.bookmarks.filter((b) => b.id !== bookmarkId),
        };
      }
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    loaded: cache.loaded,
    bookmarks: cache.bookmarks,
    bookmarkedIds: cache.bookmarkedIds,
    count: cache.bookmarks.length,
    refresh,
    toggle,
    remove,
  };
}
