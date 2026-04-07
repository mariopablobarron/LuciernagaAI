"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InfoTooltipProps = {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  size?: "sm" | "md";
};

export function InfoTooltip({ text, side = "top", size = "sm" }: InfoTooltipProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
            aria-label="Más información"
          >
            <Info className={iconSize} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs border-zinc-700 bg-zinc-800 text-xs leading-relaxed text-zinc-200"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
