"use client";

import { Flame, Medal, Trophy, Crown } from "lucide-react";

type MilestonesProps = {
  streakDays: number;
  messageCount: number;
};

const MILESTONES = [
  { id: "first-step", label: "Primer paso", desc: "Envía tu primer mensaje", icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10", check: (_s: number, m: number) => m >= 1 },
  { id: "streak-3", label: "3 días seguidos", desc: "Racha de 3 días", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10", check: (s: number) => s >= 3 },
  { id: "streak-7", label: "Una semana", desc: "Racha de 7 días", icon: Medal, color: "text-cyan-400", bg: "bg-cyan-500/10", check: (s: number) => s >= 7 },
  { id: "streak-14", label: "Dos semanas", desc: "Racha de 14 días", icon: Trophy, color: "text-violet-400", bg: "bg-violet-500/10", check: (s: number) => s >= 14 },
  { id: "streak-21", label: "Transformación", desc: "21 días de hábito", icon: Crown, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", check: (s: number) => s >= 21 },
] as const;

export default function Milestones({ streakDays, messageCount }: MilestonesProps) {
  const earned = MILESTONES.filter((m) => m.check(streakDays, messageCount));
  const next = MILESTONES.find((m) => !m.check(streakDays, messageCount));

  return (
    <div className="card-surface p-4 space-y-3">
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Logros</p>

      {/* Earned */}
      <div className="flex flex-wrap gap-2">
        {earned.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${m.bg} border border-white/5`}
              title={m.desc}
            >
              <Icon className={`w-3.5 h-3.5 ${m.color}`} />
              <span className={`text-xs font-medium ${m.color}`}>{m.label}</span>
            </div>
          );
        })}
        {earned.length === 0 && (
          <p className="text-xs text-zinc-600">Envía tu primer mensaje para desbloquear</p>
        )}
      </div>

      {/* Next milestone */}
      {next && (
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
          <next.icon className="w-3.5 h-3.5 text-zinc-600" />
          <p className="text-[11px] text-zinc-600">
            Siguiente: <span className="text-zinc-400">{next.label}</span> — {next.desc}
          </p>
        </div>
      )}
    </div>
  );
}
