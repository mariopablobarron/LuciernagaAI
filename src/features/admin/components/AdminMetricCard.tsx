import type { ReactNode } from "react";

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  accent?: "slate" | "emerald" | "sky" | "amber" | "rose" | "violet";
  hint?: string;
  icon?: ReactNode;
};

const accentStyles = {
  slate: "text-white",
  emerald: "text-emerald-400",
  sky: "text-cyan-400",
  amber: "text-amber-400",
  rose: "text-red-400",
  violet: "text-violet-400",
} as const;

export function AdminMetricCard({
  label,
  value,
  accent = "slate",
  hint,
  icon,
}: AdminMetricCardProps) {
  return (
    <div className="card-surface rounded-xl border border-zinc-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${accentStyles[accent]}`}>{value}</p>
        </div>
        {icon ? <div className="text-zinc-600">{icon}</div> : null}
      </div>
      {hint ? <p className="mt-3 text-xs leading-5 text-zinc-500">{hint}</p> : null}
    </div>
  );
}
