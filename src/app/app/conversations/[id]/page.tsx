'use client';

import Link from 'next/link';
import { ArrowLeft, Share2, Archive, Trash2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const messages = [
    { id: 1, role: 'user', content: 'Tengo una idea para un proyecto pero no sé por dónde empezar' },
    { id: 2, role: 'ai', content: '¿Cuál es lo más pequeño que podrías hacer en 30 minutos para validar si la idea funciona?' },
    { id: 3, role: 'user', content: 'Podría escribir un párrafo describiendo el problema que resuelve' },
    { id: 4, role: 'ai', content: 'Perfecto. Eso es tu siguiente paso. ¿Cuándo lo harás? ¿Hoy o mañana?' },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} flex flex-col py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl flex-1 space-y-6 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app/conversations" className="text-zinc-400 hover:text-cyan-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className={`${TYPOGRAPHY.h1} text-white`}>Cómo empezar mi proyecto</h1>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-yellow-400 transition-colors">
              <Archive className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className={`${COMPONENTS.card} p-4 space-y-3`}>
          <textarea
            placeholder="Escribe tu respuesta..."
            rows={3}
            className={`${COMPONENTS.inputField} w-full resize-none`}
          />
          <div className="flex gap-2 justify-end">
            <button className={`${COMPONENTS.buttonSecondary}`}>Cancelar</button>
            <button className={`${COMPONENTS.buttonPrimary}`}>Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
