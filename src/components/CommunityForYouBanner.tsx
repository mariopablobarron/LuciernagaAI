"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HandHeart, X } from "lucide-react";

type ForYouQuestion = {
  id: string;
  content: string;
  answerCount: number;
  createdAt: string;
};

type ForYouResponse = {
  eligible: boolean;
  reason?: string;
  question?: ForYouQuestion | null;
  openCount?: number;
  matchedOn?: string;
};

const STATE_LABEL: Record<string, string> = {
  bloqueo: "bloqueada",
  ansiedad: "ansiosa",
  duda: "con dudas",
};

/**
 * "Alguien te necesita" — surfaced only to users who already help (streak
 * or prior answers) and whose own emotional history resonates with an open
 * question. One per 24h, dismissable.
 */
export default function CommunityForYouBanner() {
  const [data, setData] = useState<ForYouResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/community/questions/for-you", {
          credentials: "include",
        });
        if (!res.ok) return;
        const payload = (await res.json()) as ForYouResponse;
        if (!cancelled) setData(payload);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || !data.eligible || !data.question || dismissed) return null;

  const stateLabel = data.matchedOn ? STATE_LABEL[data.matchedOn] ?? null : null;
  const excerpt =
    data.question.content.length > 140
      ? `${data.question.content.slice(0, 140)}…`
      : data.question.content;

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-cyan-500/5 px-4 py-3 mb-3 flex items-start gap-3 animate-in fade-in duration-500">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
        <HandHeart className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-white">
          Alguien te necesita{data.openCount && data.openCount > 1 ? ` · hay ${data.openCount} preguntas sin respuesta` : null}
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {stateLabel ? (
            <>
              Hay una persona{" "}
              <span className="text-emerald-300 font-semibold">{stateLabel}</span>{" "}
              escribiendo algo parecido a lo que tú escribiste hace un tiempo:
            </>
          ) : (
            "Una persona ha dejado una pregunta que tú podrías responder desde tu experiencia:"
          )}
        </p>
        <p className="text-sm text-zinc-200 italic">«{excerpt}»</p>
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/community?tab=questions#q-${data.question.id}`}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            Leer y responder
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Descartar"
        className="shrink-0 rounded-lg p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
