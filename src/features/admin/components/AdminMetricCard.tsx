import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  accent?: "slate" | "emerald" | "sky" | "amber" | "rose" | "violet";
  hint?: string;
  icon?: ReactNode;
};

const accentStyles = {
  slate: "text-foreground",
  emerald: "text-emerald-700 dark:text-emerald-300",
  sky: "text-sky-700 dark:text-sky-300",
  amber: "text-amber-700 dark:text-amber-300",
  rose: "text-rose-700 dark:text-rose-300",
  violet: "text-violet-700 dark:text-violet-300",
} as const;

export function AdminMetricCard({
  label,
  value,
  accent = "slate",
  hint,
  icon,
}: AdminMetricCardProps) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`mt-2 text-2xl font-semibold ${accentStyles[accent]}`}>{value}</p>
          </div>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        </div>
        {hint ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
