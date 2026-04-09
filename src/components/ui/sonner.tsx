"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className:
          "!bg-zinc-900 !border-zinc-800 !text-zinc-100 !shadow-lg !shadow-black/30",
        descriptionClassName: "!text-zinc-400",
      }}
      richColors
      closeButton
    />
  );
}
