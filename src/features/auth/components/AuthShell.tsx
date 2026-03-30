"use client";

import type { ReactNode } from "react";
import { SAAS_CONFIG } from "@/lib/saas";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
};

export function AuthShell({ title, description, children, eyebrow = "Acceso" }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-slate-200 bg-slate-950 px-8 py-10 text-white lg:border-r lg:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">{description}</p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="font-semibold">{SAAS_CONFIG.name}</p>
              <p className="mt-2 text-slate-300">{SAAS_CONFIG.description}</p>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">{children}</div>
        </section>
      </div>
    </main>
  );
}
