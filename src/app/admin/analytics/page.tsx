'use client';

import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function AdminAnalyticsPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-5xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Analytics</h1>
        </div>

        {/* Key Metrics */}
        <div className={`${LAYOUTS.gridThreeCol}`}>
          <div className={`${COMPONENTS.card} p-6 space-y-3`}>
            <div className="flex items-center justify-between">
              <Users className="w-6 h-6 text-cyan-400" />
              <span className="text-emerald-400 text-sm font-semibold">+12%</span>
            </div>
            <p className="text-zinc-400 text-sm">Total de usuarios</p>
            <p className="text-2xl font-bold text-white">2,847</p>
          </div>

          <div className={`${COMPONENTS.card} p-6 space-y-3`}>
            <div className="flex items-center justify-between">
              <MessageSquare className="w-6 h-6 text-violet-400" />
              <span className="text-emerald-400 text-sm font-semibold">+23%</span>
            </div>
            <p className="text-zinc-400 text-sm">Conversaciones esta semana</p>
            <p className="text-2xl font-bold text-white">1,204</p>
          </div>

          <div className={`${COMPONENTS.card} p-6 space-y-3`}>
            <div className="flex items-center justify-between">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              <span className="text-emerald-400 text-sm font-semibold">+8%</span>
            </div>
            <p className="text-zinc-400 text-sm">Engagement rate</p>
            <p className="text-2xl font-bold text-white">67.3%</p>
          </div>
        </div>

        {/* Charts Placeholder */}
        <div className={`${COMPONENTS.card} p-8 text-center h-96 flex items-center justify-center`}>
          <div className="space-y-4">
            <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-zinc-400">Gráficos de tendencias se cargarán aquí</p>
          </div>
        </div>

        {/* Daily Stats */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <h2 className="text-lg font-semibold text-white">Estadísticas por día</h2>
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            {[
              { day: 'Hoy', users: 342, conversations: 128, engagement: 71 },
              { day: 'Ayer', users: 318, conversations: 115, engagement: 68 },
              { day: 'Hace 2 días', users: 301, conversations: 98, engagement: 64 },
            ].map((stat) => (
              <div key={stat.day} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <span className="text-white font-semibold">{stat.day}</span>
                <div className="flex gap-8 text-sm">
                  <span className="text-zinc-400">{stat.users} usuarios</span>
                  <span className="text-zinc-400">{stat.conversations} conv.</span>
                  <span className="text-cyan-400 font-semibold">{stat.engagement}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
