'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function AdminCrisisPage() {
  const crisisEvents = [
    {
      id: 1,
      userId: 'user_892',
      level: 'critical',
      message: 'Mención de daño a sí mismo en conversación',
      timestamp: 'Hace 30 minutos',
      status: 'resolved',
    },
    {
      id: 2,
      userId: 'user_567',
      level: 'high',
      message: 'Patrón de automutilación detectado',
      timestamp: 'Hace 2 horas',
      status: 'resolved',
    },
    {
      id: 3,
      userId: 'user_123',
      level: 'critical',
      message: 'Crisis suicida: usuario reportó intención de suicidio',
      timestamp: 'Hace 4 horas',
      status: 'escalated',
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Crisis Management</h1>
        </div>

        {/* Critical Alert */}
        <div className="p-6 rounded-xl border-2 border-red-500/30 bg-red-500/10 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="font-semibold text-red-400 text-lg">Sistema de Crisis Activo</p>
          </div>
          <p className="text-red-300">
            Hay 3 eventos de crisis sin resolver. Se requiere atención inmediata.
          </p>
        </div>

        {/* Crisis Events */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <h2 className="text-lg font-semibold text-white">Eventos reportados</h2>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            {crisisEvents.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border-l-4 ${
                  event.level === 'critical'
                    ? 'border-l-red-500 bg-red-950/20'
                    : 'border-l-yellow-500 bg-yellow-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-red-400">
                        ID: {event.userId}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        event.level === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {event.level === 'critical' ? '🔴 CRÍTICO' : '🟡 ALTO'}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-sm">{event.message}</p>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.timestamp}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                      event.status === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {event.status === 'resolved' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {event.status === 'resolved' ? 'Resuelto' : 'Escalado'}
                    </span>
                    <button className={`${COMPONENTS.buttonSecondary} text-xs px-3 py-1`}>
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crisis Response Guide */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <h2 className="text-lg font-semibold text-white">Protocolo de respuesta</h2>
          <div className="space-y-3 border-t border-zinc-800 pt-4 text-sm text-zinc-300">
            <p>✓ Evento detectado → Notificación inmediata</p>
            <p>✓ Validación de mensaje → Clasificación de nivel</p>
            <p>✓ Escalada a especialista → Intervención profesional</p>
            <p>✓ Números de emergencia proporcionados → Recursos disponibles</p>
          </div>
        </div>
      </div>
    </div>
  );
}
