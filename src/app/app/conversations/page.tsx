'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, MessageSquare, Clock, Trash2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    fetch('/api/conversations', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { conversations?: Conversation[] } | null) => {
        if (!cancelled && data?.conversations) setConversations(data.conversations);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silent
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Conversaciones</h1>
          <Link
            href="/app"
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2 self-start sm:self-auto`}
          >
            <Plus className="w-4 h-4" />
            Nueva conversación
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${COMPONENTS.inputField} pl-10 w-full`}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-zinc-800/60 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${COMPONENTS.card} p-12 text-center space-y-4`}>
            <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-zinc-400">
              {search ? 'Sin resultados para esa búsqueda.' : 'No hay conversaciones todavía.'}
            </p>
            {!search && (
              <Link
                href="/app"
                className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2`}
              >
                <Plus className="w-4 h-4" />
                Empieza ahora
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((conv) => (
              <Link
                key={conv.id}
                href={`/app/conversations/${conv.id}`}
                className={`${COMPONENTS.card} p-6 flex items-start justify-between hover:border-cyan-500/50 transition-all group`}
              >
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {conv.title || 'Sin título'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeDate(conv.updatedAt)}
                    </span>
                    <span>{conv.messageCount} mensajes</span>
                  </div>
                </div>
                <button
                  onClick={(e) => void handleDelete(conv.id, e)}
                  disabled={deleting.has(conv.id)}
                  aria-label="Eliminar conversación"
                  className="ml-4 p-2 text-zinc-600 hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
