"use client";

import { useState, type ReactNode } from "react";
import { PanelLeftOpen, PanelRightOpen, Sparkles } from "lucide-react";
import LayoutSidebar from "@/components/layout/Sidebar";
import RightPanel from "@/components/layout/RightPanel";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SAAS_CONFIG } from "@/lib/saas";

type AppLayoutProps = {
  title: string;
  subtitle: string;
  summary?: ReactNode;
  prelude?: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  rightPanel: ReactNode;
};

export default function AppLayout({
  title,
  subtitle,
  summary,
  prelude,
  sidebar,
  main,
  rightPanel,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--accent)_16%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_94%,white_6%),var(--background))] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 p-3 md:p-4 xl:p-6">
        <Card className="overflow-hidden border-border/80 bg-card/85 shadow-lg shadow-black/5 backdrop-blur">
          <CardContent className="space-y-5 p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
                    <Sparkles className="size-3.5" />
                    {SAAS_CONFIG.name}
                  </Badge>
                  <Badge variant="success" className="rounded-full px-3 py-1">
                    Conversación guiada
                  </Badge>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  {subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeftOpen className="size-4" />
                  Conversaciones
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="xl:hidden"
                  onClick={() => setRightPanelOpen(true)}
                >
                  <PanelRightOpen className="size-4" />
                  Contexto
                </Button>
                <ThemeToggle />
              </div>
            </div>

            {summary ? (
              <>
                <Separator />
                <div className="flex flex-wrap items-center gap-2 text-sm">{summary}</div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {prelude ? <div className="space-y-4">{prelude}</div> : null}

        <div className="flex min-h-[32rem] flex-1 flex-col gap-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <LayoutSidebar open={sidebarOpen} onOpenChange={setSidebarOpen}>
            {sidebar}
          </LayoutSidebar>

          <div className="min-h-[32rem] lg:min-h-0">{main}</div>

          <RightPanel open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
            {rightPanel}
          </RightPanel>
        </div>
      </div>
    </main>
  );
}
