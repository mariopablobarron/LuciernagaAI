"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X, Send, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "suggestion", label: "Sugerencia" },
  { value: "bug", label: "Problema" },
  { value: "other", label: "Otro" },
] as const;

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || message.trim().length < 5) return;
    setSending(true);
    try {
      const res = await fetch("/api/user/feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), page: pathname }),
      });
      if (res.ok) {
        setSent(true);
        setMessage("");
        setTimeout(() => {
          setSent(false);
          setOpen(false);
        }, 2000);
      }
    } catch {
      // Silent
    } finally {
      setSending(false);
    }
  }, [type, message, pathname]);

  return (
    <>
      {/* Trigger button — small, bottom-right, subtle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 p-2.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-500 hover:text-violet-400 hover:border-violet-500/40 hover:bg-zinc-800 transition-all backdrop-blur-sm"
          title="Enviar feedback"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-80 rounded-xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-md shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
            <p className="text-sm font-semibold text-zinc-200">Feedback</p>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {sent ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-emerald-300 font-medium">Gracias por tu feedback</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Type selector */}
              <div className="flex gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      type === t.value
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                        : "bg-zinc-800/50 text-zinc-500 border border-transparent hover:text-zinc-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos..."
                maxLength={2000}
                rows={3}
                className="w-full p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={sending || message.trim().length < 5}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? "Enviando..." : "Enviar"}
              </button>

              <p className="text-[10px] text-zinc-600 text-center">
                Tu feedback nos ayuda a mejorar
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
