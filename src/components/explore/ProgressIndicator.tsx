"use client";

type ProgressIndicatorProps = {
  completed: number;
  total: number;
};

export default function ProgressIndicator({
  completed,
  total,
}: ProgressIndicatorProps) {
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-foreground">
        Progreso de hoy
      </div>
      <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
        <div
          className="h-full bg-gradient-to-r from-emotion-doubt to-emotion-clarity transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {completed}/{total} acciones
      </div>
    </div>
  );
}
