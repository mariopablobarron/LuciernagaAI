"use client";

import { useEffect, useState } from "react";
import { Heart, X, ChevronDown, ChevronUp } from "lucide-react";

type SupportMessage = {
  id: string;
  fromName: string;
  content: string;
  deliveredAt: string;
  readAt: string | null;
};

export default function SupportMessageBanner({ userId }: { userId?: string }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/user/support-messages", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { messages?: SupportMessage[] }) => {
        const unread = (data.messages ?? []).filter((m) => !m.readAt);
        if (unread.length > 0) setMessages(unread);
      })
      .catch(() => {});
  }, [userId]);

  async function markAllRead() {
    await fetch("/api/user/support-messages", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setMessages([]);
    setDismissed(true);
  }

  if (dismissed || messages.length === 0) return null;

  const first = messages[0];
  const hasMore = messages.length > 1;

  return (
    <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/20">
      <div className="flex items-start gap-3 px-4 py-3">
        <Heart className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-300">
            {first.fromName} te ha enviado un mensaje
          </p>
          <p className="mt-1 text-sm text-zinc-200 leading-relaxed">&quot;{first.content}&quot;</p>

          {hasMore &&
            expanded &&
            messages.slice(1).map((m) => (
              <div key={m.id} className="mt-3 border-t border-amber-500/20 pt-3">
                <p className="text-xs font-semibold text-amber-300">{m.fromName}</p>
                <p className="mt-1 text-sm text-zinc-200 leading-relaxed">
                  &quot;{m.content}&quot;
                </p>
              </div>
            ))}

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              Marcar como leído{messages.length > 1 ? "s" : ""}
            </button>
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> +{messages.length - 1} más
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-0.5 shrink-0 text-zinc-600 hover:text-zinc-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
