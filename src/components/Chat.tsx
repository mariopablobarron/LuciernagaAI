"use client";

import { KeyboardEvent, useEffect, useRef } from "react";
import Message from "@/components/Message";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  variant?: "action_required";
};

type ActionLock = {
  message: string;
  actionTitle: string;
};

type ChatProps = {
  title: string;
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string | null;
  actionLock?: ActionLock | null;
  onInputChange: (value: string) => void;
  onSend: (overrideText?: string) => Promise<void> | void;
};

export default function Chat({
  title,
  messages,
  input,
  loading,
  error,
  actionLock,
  onInputChange,
  onSend,
}: ChatProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-4">
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500">Asistente emocional + foco en acción</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Empieza la conversación. Describe tu situación y te ayudaré con claridad y acción.
            </div>
          ) : (
            messages.map((message) => (
              <Message
                key={message.id}
                role={message.role}
                content={message.content}
                isError={message.isError}
                variant={message.variant}
              />
            ))
          )}

          {loading ? (
            <Message role="assistant" content="Pensando..." />
          ) : null}

          <div ref={endRef} />
        </div>
      </div>

      <footer className="border-t border-slate-200 p-4">
        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {actionLock ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Responsabilidad activa
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-950">{actionLock.actionTitle}</p>
            <p className="mt-1 text-sm text-amber-900">{actionLock.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void onSend("Ya lo hice")}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ya lo hice
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void onSend("Lo hago luego")}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Lo hago luego
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void onSend("No lo voy a hacer")}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                No lo voy a hacer
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={
              actionLock
                ? "Responde sobre la acción pendiente o usa los accesos rápidos."
                : "Escribe tu mensaje..."
            }
            disabled={loading}
            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-700 focus:bg-white disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLock ? "Responder" : "Enviar"}
          </button>
        </div>
      </footer>
    </section>
  );
}
