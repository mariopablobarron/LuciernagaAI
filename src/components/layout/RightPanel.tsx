"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type RightPanelProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
};

export default function RightPanel({
  children,
  open,
  onOpenChange,
  title = "Contexto",
  description = "Objetivos, señales del motor y estado emocional en tiempo real.",
  className,
}: RightPanelProps) {
  return (
    <>
      <aside className={cn("hidden xl:block", className)}>
        <ScrollArea className="h-[calc(100dvh-18rem)] min-h-[30rem] pl-1">
          <div className="pb-4">{children}</div>
        </ScrollArea>
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[92vw] max-w-md p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-5 py-5 text-left">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="pb-6">{children}</div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
