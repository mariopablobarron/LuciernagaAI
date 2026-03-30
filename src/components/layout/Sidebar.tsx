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

type LayoutSidebarProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
};

export default function Sidebar({
  children,
  open,
  onOpenChange,
  title = "Conversaciones",
  description = "Navegación principal, progreso y acceso rápido del usuario.",
  className,
}: LayoutSidebarProps) {
  return (
    <>
      <aside className={cn("hidden lg:block xl:block", className)}>
        <ScrollArea className="h-[calc(100dvh-18rem)] min-h-[30rem] pr-1">
          <div className="pb-4">{children}</div>
        </ScrollArea>
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[92vw] max-w-sm p-0">
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
