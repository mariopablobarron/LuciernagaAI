import type { ReactNode } from "react";

type AdminPanelProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AdminPanel({ id, title, description, children }: AdminPanelProps) {
  return (
    <div id={id} className="card-surface rounded-xl border border-zinc-800 p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
