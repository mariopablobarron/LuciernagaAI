'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { COMPONENTS, GRADIENTS, LAYOUTS } from '@/styles/design-system';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type ChatApiResponse = {
  success?: boolean;
  response?: string;
  error?: string;
};

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    fetch(`/api/messages?conversationId=${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { messages?: Message[] } | null) => {
        if (!cancelled && data?.messages) setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-response-mode': 'json' },
        body: JSON.stringify({ message: trimmed, conversationId: id }),
      });

      const data = (await res.json()) as ChatApiResponse;

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Error al enviar el mensaje.');
        return;
      }

      const assistantMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: data.response ?? '',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [input, sending, id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex flex-col`}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 py-4">
        <div className={`${LAYOUTS.sectionInner} max-w-3xl flex items-center gap-4`}>
          <Link
            href="/app/conversations"
            className="text-zinc-400 hover:text-cyan-400 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-semibold text-white truncate">Conversación</h1>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-4`}>
          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="animate-pulse h-12 w-64 bg-zinc-800/60 rounded-xl" />
                </div>
              ))}
            </>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-6 py-12">
              {/* Bienvenida del coach */}
              <div className="flex justify-start w-full">
                <div className="flex items-start gap-3 max-w-[85%] sm:max-w-lg">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-sm">🔥</span>
                  </div>
                  <div className="bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
                    Hola. Estoy aquí. ¿Qué está pasando ahora mismo que te tiene aquí?
                  </div>
                </div>
              </div>
              {/* Sugerencias rápidas */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "No sé por dónde empezar",
                  "Me siento bloqueado",
                  "Necesito claridad sobre algo",
                  "Tengo que tomar una decisión",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/50 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) =>
              message.role === 'assistant' ? (
                <div key={message.id} className="flex justify-start">
                  <div className="flex items-start gap-3 max-w-[85%] sm:max-w-lg">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-sm">🔥</span>
                    </div>
                    <div className="bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-lg bg-linear-to-br from-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              )
            )
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-sm">🔥</span>
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center h-10">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur px-4 py-4">
        <div className={`${LAYOUTS.sectionInner} max-w-3xl flex gap-3 items-end`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje… (Enter para enviar)"
            rows={1}
            className={`${COMPONENTS.inputField} flex-1 resize-none min-h-11 max-h-36 py-2.5`}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            aria-label="Enviar"
            className={`${COMPONENTS.buttonPrimary} p-3 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
