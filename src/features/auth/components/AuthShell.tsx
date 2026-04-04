"use client";

import type { ReactNode } from "react";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SAAS_CONFIG } from "@/lib/saas";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
};

export function AuthShell({ title, description, children, eyebrow = "Acceso" }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_95%,white_5%),var(--background))] p-4 text-foreground md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <Card className="w-full overflow-hidden border-border/80 bg-card/92 shadow-xl shadow-black/5">
          <CardContent className="grid p-0 lg:grid-cols-[0.98fr_1.02fr]">
            <section className="border-b border-border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_55%,black_45%),color-mix(in_oklab,var(--card)_80%,black_20%))] px-8 py-10 text-white lg:border-r lg:border-b-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 rounded-full bg-white/10 px-3 py-1 text-white"
                  >
                    <Sparkles className="size-3.5" />
                    {eyebrow}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 rounded-full bg-white/10 px-3 py-1 text-white"
                  >
                    <LockKeyhole className="size-3.5" />
                    Protegido
                  </Badge>
                </div>
                <ThemeToggle />
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/75">{description}</p>

              <div className="mt-8 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">
                  <p className="font-semibold">{SAAS_CONFIG.name}</p>
                  <p className="mt-2 text-white/70">{SAAS_CONFIG.description}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Garantías
                  </p>
                  <div className="mt-3 space-y-2 text-white/70">
                    <p className="flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      Sesión admin separada del usuario final
                    </p>
                    <p className="flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      Acceso controlado y orientado a operación
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-6 py-8 sm:px-8 sm:py-10">{children}</section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
