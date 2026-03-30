import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  accent?: "slate" | "emerald" | "sky" | "amber" | "rose" | "violet";
  hint?: string;
  icon?: ReactNode;
};

const accentStyles = {
  slate: "text-foreground",
  emerald: "text-[color:color-mix(in_oklab,var(--signal-success)_55%,var(--foreground))]",
  sky: "text-[color:color-mix(in_oklab,var(--emotion-doubt)_78%,var(--foreground))]",
  amber: "text-[color:color-mix(in_oklab,var(--signal-warning)_60%,var(--foreground))]",
  rose: "text-[color:color-mix(in_oklab,var(--signal-danger)_60%,var(--foreground))]",
  violet: "text-[color:color-mix(in_oklab,var(--emotion-doubt)_60%,var(--foreground))]",
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
