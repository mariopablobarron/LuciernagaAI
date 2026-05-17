"use client";

/**
 * Botón "esto no me sirvió" — feedback negativo específico de UNA respuesta
 * del mentor. Se renderiza junto a Copy y SpeakButton en cada bubble del
 * mentor.
 *
 * UX:
 *  - Icono ThumbsDown (lucide), discreto, gris.
 *  - Click → modal pequeño con textarea opcional (cero campo obligatorio).
 *  - "Enviar" envía a /api/feedback/message con {messageId, reason}.
 *  - Tras enviar: confirmación visual (icono ✓ verde 2s) y el botón
 *    queda "marcado" para que el usuario no envíe duplicados.
 *
 * Si el envío falla (red, rate limit), no rompe — el botón vuelve a estado
 * inicial y muestra tooltip de error.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ThumbsDown, Check, X } from "lucide-react";

type Props = {
  messageId: string;
  className?: string;
};

type State = "idle" | "modal" | "sending" | "sent" | "error";

const MAX_REASON = 500;

export function NegativeFeedbackButton({ messageId, className }: Props) {
  const t = useTranslations("feedback.message");
  const [state, setState] = useState<State>("idle");
  const [reason, setReason] = useState("");

  const submit = useCallback(async () => {
    setState("sending");
    try {
      const res = await fetch("/api/feedback/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reason: reason.trim() }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("sent");
      // Tras 3s, el botón vuelve a quedar "marcado" (idle pero deshabilitado)
      // para que el usuario sepa que su feedback ya se envió.
      setTimeout(() => setState("sent"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }, [messageId, reason]);

  if (state === "sent") {
    return (
      <button
        type="button"
        disabled
        aria-label={t("alreadySent")}
        title={t("alreadySent")}
        className={className ?? "p-2"}
      >
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setState("modal")}
        aria-label={t("trigger")}
        title={state === "error" ? t("errorRetry") : t("trigger")}
        className={className ?? "p-2"}
      >
        <ThumbsDown className={`h-3.5 w-3.5 ${state === "error" ? "text-red-400" : "text-zinc-600 hover:text-zinc-400"}`} />
      </button>

      {(state === "modal" || state === "sending") && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("modalTitle")}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md px-4"
          onClick={() => { if (state !== "sending") setState("idle"); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setState("idle")}
              disabled={state === "sending"}
              aria-label={t("close")}
              className="absolute top-3 right-3 p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-30"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>

            <h3 className="text-base font-semibold text-white mb-1">{t("modalTitle")}</h3>
            <p className="text-xs text-zinc-500 mb-4">{t("modalSubtitle")}</p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              placeholder={t("placeholder")}
              rows={4}
              autoFocus
              disabled={state === "sending"}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none disabled:opacity-50"
            />
            <p className="mt-1 text-right text-[10px] text-zinc-600">
              {reason.length}/{MAX_REASON}
            </p>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setState("idle")}
                disabled={state === "sending"}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={state === "sending"}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state === "sending" ? t("sending") : t("send")}
              </button>
            </div>

            <p className="mt-3 text-[10px] text-zinc-600 leading-relaxed">
              {t("disclosure")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
