'use client';

import Link from 'next/link';
import { Search, Plus, MessageSquare, Clock, Trash2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function ConversationsPage() {
  const conversations = [
    { id: 1, title: 'Cómo empezar mi proyecto', date: 'Hace 2 horas', messages: 12 },
    { id: 2, title: 'Bloqueado con la decisión de carrera', date: 'Ayer', messages: 18 },
    { id: 3, title: 'Superar la procrastinación', date: 'Hace 3 días', messages: 7 },
    { id: 4, title: 'Ansiedad antes de presentaciones', date: 'Hace 1 semana', messages: 24 },
    { id: 5, title: 'Estructura de mi próximo objetivo', date: 'Hace 2 semanas', messages: 15 },
    { id: 6, title: 'Reflexión sobre cambios', date: 'Hace 1 mes', messages: 31 },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Conversaciones</h1>
          <Link
            href="/app"
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2`}
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
            className={`${COMPONENTS.inputField} pl-10 w-full`}
          />
        </div>

        {/* Conversations List */}
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/app/conversations/${conv.id}`}
              className={`${COMPONENTS.card} p-6 flex items-start justify-between hover:border-cyan-500/50 transition-all group`}
            >
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {conv.title}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {conv.date}
                  </span>
                  <span>{conv.messages} mensajes</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="ml-4 p-2 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Link>
          ))}
        </div>

        {/* Empty state would go here */}
      </div>
    </div>
  );
}
