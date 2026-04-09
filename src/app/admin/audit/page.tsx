'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Clock, User } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function AdminAuditPage() {
  const auditLogs = [
    { id: 1, user: 'admin@tresmilmillonesdelatidos.es', action: 'Login', timestamp: 'Hace 2 horas', status: 'success' },
    { id: 2, user: 'system', action: 'Backup ejecutado', timestamp: 'Hace 4 horas', status: 'success' },
    { id: 3, user: 'user_123', action: 'Cuenta eliminada', timestamp: 'Hace 6 horas', status: 'success' },
    { id: 4, user: 'admin@tresmilmillonesdelatidos.es', action: 'Configuración actualizada', timestamp: 'Ayer', status: 'success' },
    { id: 5, user: 'user_456', action: 'Intento de acceso rechazado', timestamp: 'Ayer', status: 'warning' },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Audit Log</h1>
        </div>

        {/* Filters */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buscar usuario..."
              className={`${COMPONENTS.inputField}`}
            />
            <select className={`${COMPONENTS.inputField}`}>
              <option>Todos los eventos</option>
              <option>Login</option>
              <option>Cambios de configuración</option>
              <option>Errores</option>
            </select>
            <input
              type="date"
              className={`${COMPONENTS.inputField}`}
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className={`${COMPONENTS.card} p-6 space-y-3`}>
          <h2 className="text-lg font-semibold text-white">Eventos recientes</h2>
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-3 flex-1">
                  <Shield className="w-5 h-5 text-zinc-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{log.action}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {log.user}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.timestamp}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    log.status === 'success' 
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {log.status === 'success' ? '✓' : '⚠'} {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
