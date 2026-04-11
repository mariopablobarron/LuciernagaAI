"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

type AudioRecorderProps = {
  onAudioReady: (base64: string, durationSec: number) => void;
  disabled?: boolean;
  className?: string;
};

export function AudioRecorder({ onAudioReady, disabled, className = "" }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Ignore recordings that are too short (< 500 bytes ≈ silence/empty)
        if (blob.size < 500) {
          setRecording(false);
          setSeconds(0);
          return;
        }

        setProcessing(true);
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Use the ref-based duration to avoid stale closure
          const duration = Math.max(1, secondsRef.current);
          onAudioReady(base64, duration);
          setProcessing(false);
          setSeconds(0);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setSeconds(0);

      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          secondsRef.current = next;
          if (next >= 120) {
            mediaRecorderRef.current?.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            return s;
          }
          return next;
        });
      }, 1000);
    } catch {
      // Permission denied or no mic
    }
  }, [onAudioReady, seconds]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  if (processing) {
    return (
      <button type="button" disabled className={`p-2.5 min-h-11 min-w-11 rounded-xl flex items-center justify-center bg-zinc-800 text-zinc-500 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </button>
    );
  }

  if (recording) {
    return (
      <button
        type="button"
        onClick={stop}
        className={`p-2.5 min-h-11 rounded-xl flex items-center gap-2 bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)] ${className}`}
      >
        <Square className="w-4 h-4 fill-current" />
        <span className="text-xs font-mono tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={disabled}
      title="Grabar nota de voz (max 2 min)"
      className={`p-2.5 min-h-11 min-w-11 rounded-xl flex items-center justify-center bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-all disabled:opacity-30 ${className}`}
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
