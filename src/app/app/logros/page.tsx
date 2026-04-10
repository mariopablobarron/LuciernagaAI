"use client";

import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Compass,
  Flame,
  Heart,
  Lock,
  Target,
  Trophy,
  Users,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type BadgeDefinition = {
  key: string;
  label: string;
  desc: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
};

// ─── Icon map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  compass: Compass,
  flame: Flame,
  trophy: Trophy,
  "check-circle": CheckCircle,
  target: Target,
  calendar: Calendar,
  heart: Heart,
  book: BookOpen,
  users: Users,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LogrosPage() {
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/badges", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDefinitions(d.definitions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const earnedCount = definitions.filter((d) => d.earned).length;
  const totalCount = definitions.length;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-500/20">
            <Award className="h-5 w-5 text-violet-400" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-white">Logros</h1>
          {!loading && (
            <p className="text-sm text-zinc-400">
              {earnedCount} de {totalCount} logros desbloqueados
            </p>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          </div>
        )}

        {/* Badge grid */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {definitions.map((badge) => {
              const IconComponent = ICON_MAP[badge.icon] ?? Award;
              const earned = badge.earned;

              return (
                <div
                  key={badge.key}
                  className={`relative rounded-xl border p-4 transition ${
                    earned
                      ? "border-violet-500/40 bg-violet-950/30"
                      : "border-zinc-800 bg-zinc-900/40 opacity-60"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
                      earned
                        ? "bg-violet-500/20 ring-1 ring-violet-500/30"
                        : "bg-zinc-800 ring-1 ring-zinc-700"
                    }`}
                  >
                    {earned ? (
                      <IconComponent
                        className="h-5 w-5 text-violet-400"
                      />
                    ) : (
                      <Lock className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>

                  {/* Text */}
                  <h3
                    className={`mb-0.5 text-sm font-semibold ${
                      earned ? "text-white" : "text-zinc-500"
                    }`}
                  >
                    {badge.label}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {badge.desc}
                  </p>

                  {/* Earned date */}
                  {earned && badge.earnedAt && (
                    <p className="mt-2 text-[10px] text-violet-400/70">
                      {formatDate(badge.earnedAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && definitions.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-500">
              No hay logros disponibles todavia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
