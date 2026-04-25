"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";

type PendingLetter = {
  id: string;
  subject: string;
  body: string;
  state: string;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
};

type Props = {
  /** If a letter id is present in ?letter=... on /app, open the modal automatically. */
  initialLetterId?: string | null;
  /** Called when the user taps "Seguir conversando". Passes a suggested prompt. */
  onContinueConversation?: (suggestedPrompt: string) => void;
};

function extractFinalQuestion(body: string): string {
  // Find the last sentence that ends with "?" — use it as the chat starter.
  const matches = body.match(/[^.?!]*\?[»"']?/g);
  if (!matches || matches.length === 0) return "Sigue la conversación";
  return matches[matches.length - 1].trim();
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const f = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
}

export default function WeeklyLetterBanner({
  initialLetterId,
  onContinueConversation,
}: Props) {
  const [letter, setLetter] = useState<PendingLetter | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const openedRef = useRef(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/weekly-letter/pending", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { letter: PendingLetter | null };
      setLetter(data.letter);
    } catch {
      // silent
    }
  }, []);

  const fetchById = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/weekly-letter/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { letter: PendingLetter | null };
      if (data.letter) {
        setLetter(data.letter);
        setModalOpen(true);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // Las llamadas se difieren a una microtask para no encadenar setState
    // sincrónico desde dentro del effect (regla react-hooks/set-state-in-effect
    // de React 19). Comportamiento idéntico, pero el setState ocurre en el
    // siguiente tick.
    if (initialLetterId && !openedRef.current) {
      openedRef.current = true;
      queueMicrotask(() => {
        void fetchById(initialLetterId);
      });
    } else {
      queueMicrotask(() => {
        void fetchPending();
      });
    }
  }, [initialLetterId, fetchPending, fetchById]);

  const markOpened = useCallback(async () => {
    if (!letter) return;
    try {
      await fetch(`/api/weekly-letter/${letter.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open" }),
      });
    } catch {
      // silent
    }
  }, [letter]);

  const markRead = useCallback(async () => {
    if (!letter) return;
    try {
      await fetch(`/api/weekly-letter/${letter.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });
    } catch {
      // silent
    }
  }, [letter]);

  const handleOpen = () => {
    setModalOpen(true);
    void markOpened();
  };

  const handleClose = () => {
    setModalOpen(false);
    void markRead();
    setLetter(null); // hide banner after read
  };

  const handleContinue = () => {
    if (!letter) return;
    const question = extractFinalQuestion(letter.body);
    onContinueConversation?.(question);
    setModalOpen(false);
    void markRead();
    setLetter(null);
  };

  if (!letter) return null;

  return (
    <>
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/8 to-fuchsia-500/5 px-4 py-3 mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
          <Mail className="h-4 w-4 text-violet-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{letter.subject}</p>
          <p className="text-xs text-zinc-400 truncate">
            Tu carta de la semana · {formatWeekRange(letter.weekStart, letter.weekEnd)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="shrink-0 rounded-xl bg-violet-500 hover:bg-violet-400 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
        >
          Leer
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-letter-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar"
              className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold mb-1">
              Tu carta · {formatWeekRange(letter.weekStart, letter.weekEnd)}
            </p>
            <h2
              id="weekly-letter-title"
              className="text-2xl sm:text-3xl font-serif text-white leading-tight mb-6"
            >
              {letter.subject}
            </h2>

            <div className="prose prose-invert max-w-none text-zinc-200 text-base leading-relaxed whitespace-pre-wrap font-serif">
              {letter.body}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl bg-violet-500 hover:bg-violet-400 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                Seguir la conversación
              </button>
              <Link
                href="/app/diario"
                onClick={() => void markRead()}
                className="rounded-xl border border-zinc-700 hover:border-zinc-600 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors"
              >
                Abrir el diario
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
