"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, BellOff } from "lucide-react";

type VideoSource = "goal" | "broadcast";

type WeeklyVideo = {
  id: string;
  source: VideoSource;
  phase: string | null;
  videoUrl: string;
  script: string;
};

/**
 * Shows the weekly avatar video once per week when the user opens the app.
 * Silently no-ops if there's no video ready for this week or the user
 * has already seen it.
 *
 * Mounted in the chat layout; self-contained — no props required.
 */
export function AvatarWeeklyModal() {
  const [video, setVideo] = useState<WeeklyVideo | null>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const dismissedRef = useRef(false);

  // Fetch the current week's video on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/avatar/weekly", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = (await res.json()) as {
          success: boolean;
          video: WeeklyVideo | null;
        };
        return json.video;
      })
      .then((v) => {
        if (cancelled) return;
        if (v) {
          setVideo(v);
          setVisible(true);
        }
      })
      .catch(() => {
        // Silent — never break the chat because of the avatar feature
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeenAndClose = useCallback(async () => {
    if (dismissedRef.current || !video) return;
    dismissedRef.current = true;
    setVisible(false);
    try {
      await fetch("/api/avatar/weekly", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video.id, source: video.source }),
      });
    } catch {
      // Silent — seen state is best-effort
    }
  }, [video]);

  const optOut = useCallback(async () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    try {
      // Mark the current video as seen AND disable future ones.
      await Promise.all([
        video
          ? fetch("/api/avatar/weekly", {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: video.id, source: video.source }),
            })
          : Promise.resolve(),
        fetch("/api/avatar/weekly/opt-out", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: false }),
        }),
      ]);
    } catch {
      // Silent
    }
  }, [video]);

  if (!visible || !video) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mensaje semanal de tu mentor"
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Close when clicking backdrop, not the modal content
        if (e.target === e.currentTarget) markSeenAndClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <button
          type="button"
          onClick={markSeenAndClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-zinc-300 hover:bg-black/80 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-hidden rounded-2xl">
          <video
            src={video.videoUrl}
            autoPlay
            controls
            playsInline
            className="w-full aspect-9/16 bg-black"
            onPlay={() => setPlaying(true)}
            onEnded={markSeenAndClose}
          />
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-violet-400 font-semibold">
            {video.source === "broadcast"
              ? "Un mensaje para ti"
              : video.phase === "START"
                ? "Acabas de dar un paso"
                : video.phase === "MIDPOINT"
                  ? "Te veo en esta parte del camino"
                  : video.phase === "END"
                    ? "Has llegado"
                    : "Tu mensaje del mentor"}
          </p>
          {playing && video.script && (
            <p className="text-sm text-zinc-300 leading-relaxed italic">
              &ldquo;{video.script}&rdquo;
            </p>
          )}
          <button
            type="button"
            onClick={markSeenAndClose}
            className="w-full rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Entendido
          </button>
          <button
            type="button"
            onClick={optOut}
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <BellOff className="h-3 w-3" />
            No quiero recibir más videos
          </button>
        </div>
      </div>
    </div>
  );
}
