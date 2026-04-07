import type { ReactNode } from "react";
import { InfoTooltip } from "./InfoTooltip";

type AdminPanelProps = {
  id?: string;
  title: string;
  description?: string;
  tooltip?: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function AdminPanel({ id, title, description, tooltip, headerRight, children }: AdminPanelProps) {
  return (
    <div id={id} className="card-surface rounded-xl border border-zinc-800 p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {tooltip ? <InfoTooltip text={tooltip} side="right" /> : null}
          </div>
          {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
