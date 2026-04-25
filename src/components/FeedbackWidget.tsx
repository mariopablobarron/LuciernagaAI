"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { useSfx } from "@/lib/useSfx";

// ─── Config ──────────────────────────────────────────────────────────────────

const LAST_SHOWN_KEY = "feedback-last-shown";
const MIN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // once per week max

type FeedbackType = "suggestion" | "bug" | "other";

const TYPE_OPTIONS: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: "suggestion", label: "Sugerencia", emoji: "💡" },
  { value: "bug", label: "Problema", emoji: "🐛" },
  { value: "other", label: "Otro", emoji: "💬" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function FeedbackWidget() {
  const pathname = usePathname();
  const sfx = useSfx();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const closeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => closeTimers.current.forEach(clearTimeout);
  }, []);

  // Auto-prompt once per week, 90s into the session
  useEffect(() => {
    const last = localStorage.getItem(LAST_SHOWN_KEY);
    if (last && Date.now() - Number(last) < MIN_INTERVAL_MS) return;
    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
    }, 90_000);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const submit = useCallback(async () => {
    if (sending) return;
    if (!rating && message.trim().length < 5) {
      toast.error("Selecciona una valoracion o escribe un comentario");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/user/feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: rating ? "nps" : type,
          rating: rating || undefined,
          message: message.trim() || undefined,
          page: pathname,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "Error al enviar");
      }
      sfx.play("success");
      setSent(true);
      localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      const t1 = setTimeout(() => {
        setOpen(false);
        const t2 = setTimeout(() => { setSent(false); setRating(0); setMessage(""); setType("suggestion"); }, 300);
        closeTimers.current.push(t2);
      }, 2000);
      closeTimers.current.push(t1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  }, [rating, type, message, pathname, sending, sfx]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const ratingLabel =
    rating <= 2 ? "Sentimos que no haya sido mejor. Cuentanos mas." :
    rating === 3 ? "Bien, pero se puede mejorar." :
    rating === 4 ? "Nos alegra." : "Genial!";

  return (
    <>
      {/* Floating tab — right edge */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir formulario de feedback"
          title="Enviar feedback rápido sobre la app"
          data-tour="feedback"
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 rounded-xl border border-zinc-700/60 bg-zinc-900/95 px-3 py-2.5 text-xs font-medium text-zinc-400 hover:text-fuchsia-400 hover:border-fuchsia-500/40 hover:bg-zinc-900 backdrop-blur-sm shadow-lg transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={close}
        >
          <div
            role="dialog"
            aria-label="Formulario de feedback"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/50 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 className="text-sm font-semibold text-white">
                {sent ? "Gracias" : "Tu opinion nos importa"}
              </h2>
              <button onClick={close} className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <div className="px-5 pb-6 pt-2 text-center space-y-2">
                <p className="text-3xl">💜</p>
                <p className="text-sm text-zinc-300">Tu feedback nos ayuda a mejorar.</p>
              </div>
            ) : (
              <div className="px-5 pb-5 space-y-4">
                {/* Star rating */}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Como valoras tu experiencia?</p>
                  <div className="flex gap-1" role="radiogroup" aria-label="Valoracion de experiencia">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} de 5 estrellas`}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-2 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            n <= (hoverRating || rating)
                              ? "text-fuchsia-400 fill-fuchsia-400"
                              : "text-zinc-700"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && <p className="text-xs text-zinc-500">{ratingLabel}</p>}
                </div>

                {/* Type selector */}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Tipo de feedback</p>
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                          type === opt.value
                            ? "bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-300"
                            : "border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <label htmlFor="feedback-message" className="sr-only">Tu comentario</label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Que te gustaria que mejorara..."
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/50 resize-none"
                />

                {/* Submit */}
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={sending || (!rating && message.trim().length < 5)}
                  className="w-full rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? "Enviando..." : "Enviar feedback"}
                </button>

                <p className="text-xs text-zinc-700 text-center">
                  Tu feedback es anonimo y nos ayuda a priorizar mejoras.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
