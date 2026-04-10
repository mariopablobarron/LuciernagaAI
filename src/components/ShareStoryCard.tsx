"use client";

import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, ChevronLeft, ChevronRight, Flame, Target, Brain, Zap, Sparkles } from "lucide-react";

// ─── Story types ─────────────────────────────────────────────────────────────

type StoryData = {
  name: string | null;
  streakDays: number;
  completedActions: number;
  totalActions: number;
  goalTitle: string | null;
  state: string;
  plan: string;
};

type StoryTemplate = {
  id: string;
  label: string;
  render: (data: StoryData) => React.ReactNode;
};

// ─── Visual helpers ──────────────────────────────────────────────────────────

const STATE_EMOJI: Record<string, string> = {
  claridad: "✨",
  neutral: "🔵",
  duda: "🌫️",
  bloqueo: "🧱",
  ansiedad: "⚡",
};

const STATE_LABEL: Record<string, string> = {
  claridad: "Claridad",
  neutral: "En calma",
  duda: "Explorando",
  bloqueo: "Superando bloqueos",
  ansiedad: "Gestionando",
};

function StreakRing({ days, size = 140 }: { days: number; size?: number }) {
  const progress = Math.min(days / 21, 1);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#streak-grad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
        <defs>
          <linearGradient id="streak-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f0abfc" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white">{days}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">dias</span>
      </div>
    </div>
  );
}

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: StoryTemplate[] = [
  {
    id: "streak",
    label: "Racha",
    render: (data) => (
      <div className="flex flex-col items-center justify-between h-full py-16 px-8">
        <div className="text-center space-y-2">
          <Flame className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Mi racha</p>
        </div>
        <StreakRing days={data.streakDays} size={180} />
        <div className="text-center space-y-3">
          <p className="text-lg font-bold text-white">
            {data.streakDays >= 21
              ? "Transformacion completada"
              : data.streakDays >= 7
                ? "Una semana sin parar"
                : data.streakDays >= 3
                  ? "Constancia en marcha"
                  : "Cada dia cuenta"}
          </p>
          <p className="text-xs text-zinc-500">{data.name ?? "Un latido a la vez"}</p>
        </div>
        <StoryBranding />
      </div>
    ),
  },
  {
    id: "progress",
    label: "Progreso",
    render: (data) => {
      const pct = data.totalActions > 0 ? Math.round((data.completedActions / data.totalActions) * 100) : 0;
      return (
        <div className="flex flex-col items-center justify-between h-full py-16 px-8">
          <div className="text-center space-y-2">
            <Target className="w-8 h-8 text-cyan-400 mx-auto" />
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Mi objetivo</p>
          </div>
          <div className="text-center space-y-6 w-full">
            <p className="text-xl font-bold text-white leading-tight px-4">
              {data.goalTitle ?? "Avanzando paso a paso"}
            </p>
            <div className="w-full max-w-[240px] mx-auto">
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>{data.completedActions} de {data.totalActions}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-center space-y-3">
            <p className="text-sm text-zinc-400">
              {pct === 100 ? "Objetivo completado" : pct >= 50 ? "Mas de la mitad" : "En progreso"}
            </p>
            <p className="text-xs text-zinc-500">{data.name ?? ""}</p>
          </div>
          <StoryBranding />
        </div>
      );
    },
  },
  {
    id: "state",
    label: "Estado",
    render: (data) => (
      <div className="flex flex-col items-center justify-between h-full py-16 px-8">
        <div className="text-center space-y-2">
          <Brain className="w-8 h-8 text-fuchsia-400 mx-auto" />
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Mi estado hoy</p>
        </div>
        <div className="text-center space-y-4">
          <div className="text-7xl">{STATE_EMOJI[data.state] ?? "🔵"}</div>
          <p className="text-2xl font-black text-white">
            {STATE_LABEL[data.state] ?? "En proceso"}
          </p>
        </div>
        <div className="text-center space-y-4 w-full">
          <div className="flex items-center justify-center gap-6 text-zinc-400">
            <div className="text-center">
              <Flame className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-lg font-bold text-white">{data.streakDays}</p>
              <p className="text-[10px] uppercase tracking-wider">dias</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center">
              <Zap className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
              <p className="text-lg font-bold text-white">{data.completedActions}</p>
              <p className="text-[10px] uppercase tracking-wider">acciones</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500">{data.name ?? ""}</p>
        </div>
        <StoryBranding />
      </div>
    ),
  },
  {
    id: "milestone",
    label: "Hito",
    render: (data) => {
      const milestone =
        data.streakDays >= 21 ? { emoji: "🏆", text: "21 dias de transformacion", sub: "Lo que empezo como un reto ya es parte de mi" }
        : data.streakDays >= 14 ? { emoji: "🔥", text: "14 dias consecutivos", sub: "La constancia esta dando frutos" }
        : data.streakDays >= 7 ? { emoji: "💪", text: "1 semana sin parar", sub: "Cada dia mas claro" }
        : data.streakDays >= 3 ? { emoji: "🌱", text: "3 dias seguidos", sub: "El habito esta naciendo" }
        : { emoji: "💓", text: "Primer latido", sub: "El viaje empieza aqui" };
      return (
        <div className="flex flex-col items-center justify-between h-full py-16 px-8">
          <div className="text-center space-y-2">
            <Sparkles className="w-8 h-8 text-violet-400 mx-auto" />
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Hito desbloqueado</p>
          </div>
          <div className="text-center space-y-5">
            <div className="text-8xl">{milestone.emoji}</div>
            <p className="text-2xl font-black text-white leading-tight">{milestone.text}</p>
            <p className="text-sm text-zinc-400 italic max-w-[260px] mx-auto">&ldquo;{milestone.sub}&rdquo;</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500">{data.name ?? ""}</p>
          </div>
          <StoryBranding />
        </div>
      );
    },
  },
];

function StoryBranding() {
  return (
    <div className="flex items-center gap-2 opacity-60">
      <span className="text-lg">💓</span>
      <span className="text-[11px] font-bold tracking-tight text-zinc-400">tresmilmillonesdelatidos.es</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type ShareStoryCardProps = {
  data: StoryData;
  onClose?: () => void;
};

export function ShareStoryCard({ data, onClose }: ShareStoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const template = TEMPLATES[activeIndex];

  const [downloadError, setDownloadError] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      // Retry up to 3 times — html-to-image sometimes fails on first attempt
      // due to font loading or image rendering timing
      let dataUrl = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          dataUrl = await toPng(cardRef.current, {
            width: 1080,
            height: 1920,
            pixelRatio: 1,
            backgroundColor: "#09090b",
            skipFonts: true,
            cacheBust: true,
          });
          if (dataUrl) break;
        } catch {
          if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
        }
      }
      if (!dataUrl) throw new Error("Failed after retries");
      const link = document.createElement("a");
      link.download = `latidos-${template.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  }, [template.id]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        backgroundColor: "#09090b",
        skipFonts: true,
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `latidos-${template.id}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Mi progreso en Tres Mil Millones de Latidos",
          text: "Cada latido cuenta. tresmilmillonesdelatidos.es",
        });
      } else {
        // Fallback: download
        await handleDownload();
      }
    } catch {
      await handleDownload();
    }
  }, [template.id, handleDownload]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Compartir progreso</h3>
          {onClose && (
            <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white transition-colors">
              Cerrar
            </button>
          )}
        </div>

        {/* Template selector */}
        <div className="flex gap-2">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveIndex(i)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-all ${
                i === activeIndex
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Card preview */}
        <div className="relative mx-auto" style={{ width: "100%", aspectRatio: "9/16" }}>
          {/* Navigation arrows */}
          {activeIndex > 0 && (
            <button
              onClick={() => setActiveIndex((i) => i - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/60 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {activeIndex < TEMPLATES.length - 1 && (
            <button
              onClick={() => setActiveIndex((i) => i + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/60 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* The actual card (rendered at preview size, exported at 1080x1920) */}
          <div
            ref={cardRef}
            className="w-full h-full rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #09090b 0%, #18181b 40%, #1e1033 100%)",
            }}
          >
            {template.render(data)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generando..." : "Descargar"}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
        </div>

        {downloadError && (
          <p className="text-center text-xs text-red-400">
            No se pudo generar la imagen. Prueba con una captura de pantalla.
          </p>
        )}
        <p className="text-center text-[10px] text-zinc-600">
          La imagen se genera en formato Story (1080x1920). Perfecta para Instagram, WhatsApp o LinkedIn.
        </p>
      </div>
    </div>
  );
}
