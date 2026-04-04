"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp } from "lucide-react";
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from "@/styles/design-system";

export default function CheckinHistoryPage() {
  const checkins = [
    {
      date: "Hoy",
      state: "clarity",
      energy: 4,
      note: "Tuve una buena sesión de trabajo enfocado. Completé el objetivo del día sin distracciones.",
    },
    {
      date: "Ayer",
      state: "anxious",
      energy: 3,
      note: "Me sentía con mucha energía dispersa pero conseguí canalizar en una tarea. Mejor que antes.",
    },
    {
      date: "Hace 2 días",
      state: "doubt",
      energy: 2,
      note: "Día de incertidumbre. No sabía qué priorizar pero hice una lista y eso ayudó.",
    },
    {
      date: "Hace 3 días",
      state: "clarity",
      energy: 5,
      note: "Excelente día. Energía alta y dirección clara. Completé múltiples tareas.",
    },
  ];

  const stateLabels = {
    clarity: { label: "Claro", color: "text-cyan-400", bg: "bg-cyan-500/10" },
    anxious: { label: "Ansioso", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    doubt: { label: "Dudoso", color: "text-violet-400", bg: "bg-violet-500/10" },
    blocked: { label: "Bloqueado", color: "text-red-400", bg: "bg-red-500/10" },
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/impulso/checkin"
            className="text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Historial de check-ins</h1>
        </div>

        {/* Stats */}
        <div className={`${LAYOUTS.gridThreeCol}`}>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-cyan-400">7</p>
            <p className="text-sm text-zinc-400">Racha actual</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-violet-400">3.5</p>
            <p className="text-sm text-zinc-400">Energía promedio</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-cyan-400">28%</p>
            <p className="text-sm text-zinc-400">Claridad (últimos 7d)</p>
          </div>
        </div>

        {/* Checkins */}
        <div className="space-y-3">
          {checkins.map((checkin, i) => {
            const stateInfo = stateLabels[checkin.state as keyof typeof stateLabels];
            return (
              <div key={i} className={`${COMPONENTS.card} p-6 space-y-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-600" />
                      {checkin.date}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${stateInfo.bg} ${stateInfo.color}`}
                      >
                        {stateInfo.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Energía: {checkin.energy}/5
                        {checkin.energy >= 4 && (
                          <TrendingUp className="w-3 h-3 inline ml-1 text-cyan-400" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-zinc-300 italic border-t border-zinc-800 pt-3">
                  &quot;{checkin.note}&quot;
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          href="/impulso/checkin"
          className={`${COMPONENTS.buttonPrimary} block w-full text-center`}
        >
          Hacer nuevo check-in
        </Link>
      </div>
    </div>
  );
}
