import type { ReactNode } from "react";

type AdminPanelProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AdminPanel({ id, title, description, children }: AdminPanelProps) {
  return (
    <section
      id={id}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
