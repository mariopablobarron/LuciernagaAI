"use client";

import type { ReactNode } from "react";
import { SAAS_ADMIN_NAV, SAAS_CONFIG } from "@/lib/saas";

type AdminShellProps = {
  title: string;
  subtitle: string;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
};

export function AdminShell({ title, subtitle, onLogout, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 border-b border-slate-200 bg-slate-950 px-6 py-6 text-white lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                SaaS Admin
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{subtitle}</p>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Producto
                </p>
                <p className="mt-2 text-lg font-semibold">{SAAS_CONFIG.name}</p>
                <p className="mt-1 text-sm text-slate-300">{SAAS_CONFIG.description}</p>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex w-fit rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-6 py-4">
            {SAAS_ADMIN_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </section>

        {children}
      </div>
    </div>
  );
}
