import type { ReactNode } from "react";

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  accent?: "slate" | "emerald" | "sky" | "amber" | "rose" | "violet";
  hint?: string;
  icon?: ReactNode;
};

const accentStyles = {
  slate: "text-slate-900",
  emerald: "text-emerald-700",
  sky: "text-sky-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  violet: "text-violet-700",
} as const;

export function AdminMetricCard({
  label,
  value,
  accent = "slate",
  hint,
  icon,
}: AdminMetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${accentStyles[accent]}`}>{value}</p>
        </div>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </div>
      {hint ? <p className="mt-3 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}
