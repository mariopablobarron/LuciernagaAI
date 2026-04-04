"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SAAS_ADMIN_NAV, SAAS_CONFIG } from "@/lib/saas";

type AdminShellProps = {
  title: string;
  subtitle: string;
  onLogout: () => void | Promise<void>;
  showSectionNav?: boolean;
  children: ReactNode;
};

export function AdminShell({
  title,
  subtitle,
  onLogout,
  showSectionNav = true,
  children,
}: AdminShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_94%,white_6%),var(--background))] p-4 text-foreground md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden border-border/80 bg-card/90 shadow-lg shadow-black/5 backdrop-blur">
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
                    <Sparkles className="size-3.5" />
                    SaaS Admin
                  </Badge>
                  <Badge variant="warning" className="rounded-full px-3 py-1">
                    <ShieldCheck className="mr-1 size-3.5" />
                    Acceso interno
                  </Badge>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                  {subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-stretch">
                <div className="flex items-center justify-end gap-2">
                  <ThemeToggle />
                  <Button type="button" variant="outline" onClick={onLogout}>
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </Button>
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Producto
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{SAAS_CONFIG.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{SAAS_CONFIG.description}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  pathname === "/admin"
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-background/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  pathname.startsWith("/admin/users")
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-background/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                Usuarios
              </Link>
            </div>

            {showSectionNav ? (
              <div className="flex flex-wrap gap-2">
                {SAAS_ADMIN_NAV.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="rounded-full border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {children}
      </div>
    </main>
  );
}
