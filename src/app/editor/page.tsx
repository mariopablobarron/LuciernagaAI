"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, FileText, Grip, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BlockEditor = dynamic(() => import("@/components/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[520px] animate-pulse rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm" />
  ),
});

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_color-mix(in_oklab,var(--accent)_16%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_95%,white_5%),var(--background))] p-4 lg:p-6">
      <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 lg:h-[calc(100vh-3rem)]">
        <Card className="border-border/80 bg-card/92 shadow-lg shadow-black/5">
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
                    <Sparkles className="size-3.5" />
                    Editor
                  </Badge>
                  <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
                    <Grip className="size-3.5" />
                    BlockNote
                  </Badge>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Editor de bloques
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
                  Un espacio de escritura más limpio para pensar, estructurar ideas y trabajar
                  documentos sin salir del producto.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/">
                    <ArrowLeft className="size-4" />
                    Volver al chat
                  </Link>
                </Button>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <FileText className="mr-1 size-3.5" />
                Escritura estructurada
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Drag and drop nativo
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Modo claro / oscuro
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1">
          <BlockEditor />
        </div>
      </div>
    </main>
  );
}
