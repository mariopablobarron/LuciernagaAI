"use client";

import { Volume2, VolumeOff } from "lucide-react";

type SfxToggleProps = {
  enabled: boolean;
  onToggle: () => void;
};

export default function SfxToggle({ enabled, onToggle }: SfxToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-2 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-white/5 transition-colors"
      title={enabled ? "Silenciar efectos de sonido" : "Activar efectos de sonido"}
      aria-label={enabled ? "Silenciar efectos" : "Activar efectos"}
    >
      {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeOff className="w-4 h-4" />}
    </button>
  );
}
