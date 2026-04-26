"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Check } from "lucide-react";

type Props = {
  /// Cuando es ≥ 3 y el resto de condiciones se cumplen, mostramos el CTA.
  /// Tres es el umbral mínimo para que el equipo tenga material real al
  /// que responder y para que el user haya invertido lo suficiente como
  /// para apreciar el ofrecimiento.
  userTurnsCount: number;
  /// Si el user es anónimo, le pedimos email inline. Si no, usamos su email real.
  isAnonymous: boolean;
  defaultEmail?: string;
  /// Último mensaje del user en este chat — solo se envía como preview
  /// en la alerta de Telegram al equipo, no se persiste.
  lastUserMessage?: string;
  /// Identificador estable de la conversación para guardar dismissals/submits
  /// en localStorage y no mostrar el CTA dos veces en el mismo hilo.
  conversationId: string | null | undefined;
};

const MIN_TURNS = 3;
const STORAGE_PREFIX = "tl_cta:";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function TeamLetterCta({
  userTurnsCount,
  isAnonymous,
  defaultEmail,
  lastUserMessage,
  conversationId,
}: Props) {
  const [hidden, setHidden] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo decidimos visibilidad en cliente para no parpadear durante hidratación.
  // Si la conversación ya tiene una solicitud confirmada en una sesión anterior,
  // NO volvemos a mostrar el banner verde — sólo lo enseñamos justo después de
  // confirmar para dar feedback inmediato y luego se auto-oculta.
  useEffect(() => {
    if (!conversationId) return;
    if (userTurnsCount < MIN_TURNS) return;
    try {
      const flag = localStorage.getItem(STORAGE_PREFIX + conversationId);
      if (flag === "dismissed" || flag === "sent") {
        setHidden(true);
      } else {
        setHidden(false);
      }
    } catch {
      setHidden(false);
    }
  }, [conversationId, userTurnsCount]);

  // Auto-ocultar el banner verde "Anotado…" tras 6 s para que no quede pegado
  // en cada turno posterior del chat (bug visual: el usuario percibía que el
  // mensaje "volvía a salir" en cada respuesta, cuando en realidad nunca se
  // había desmontado).
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      setDone(false);
      setHidden(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [done]);

  const persist = useCallback(
    (state: "dismissed" | "sent") => {
      if (!conversationId) return;
      try {
        localStorage.setItem(STORAGE_PREFIX + conversationId, state);
      } catch {
        // ignore
      }
    },
    [conversationId]
  );

  const handleDismiss = useCallback(() => {
    persist("dismissed");
    setHidden(true);
  }, [persist]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isAnonymous && !isValidEmail(email.trim())) {
        setError("Revisa el formato del email.");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch("/api/team-letter/request", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: isAnonymous ? email.trim() : undefined,
            lastMessage: lastUserMessage,
          }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setError("No pudimos registrar tu solicitud. Prueba en un rato.");
          return;
        }
        persist("sent");
        setDone(true);
      } catch {
        setError("Sin conexión. Prueba en un rato.");
      } finally {
        setSubmitting(false);
      }
    },
    [email, isAnonymous, lastUserMessage, persist]
  );

  if (hidden && !done) return null;

  if (done) {
    return (
      <div className="flex items-start gap-2.5 px-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30">
          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
          <p className="text-sm leading-relaxed text-emerald-100">
            Anotado. En los próximos días alguien del equipo leerá esta conversación
            y te escribirá un mensaje personal a tu email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 ring-1 ring-fuchsia-500/30">
        <Mail className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden="true" />
      </div>
      <div className="flex-1 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/15 p-3.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300">
          Una carta humana para ti
        </p>
        <p className="mb-3 text-sm leading-relaxed text-zinc-200">
          ¿Quieres que alguien del equipo lea esta conversación y te escriba una nota
          personal con una recomendación o un feedback? Te llega por email en unos días.
        </p>

        {!expanded ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors"
            >
              Sí, quiero
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Ahora no
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            {isAnonymous ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
                disabled={submitting}
                autoComplete="email"
                required
              />
            ) : (
              <p className="text-xs text-zinc-400">
                Te llegará a <span className="font-mono text-zinc-200">{defaultEmail ?? "tu email"}</span>.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                disabled={submitting}
                className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
          </form>
        )}
      </div>
    </div>
  );
}
