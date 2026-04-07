"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[ERROR-BOUNDARY] Uncaught Error:", error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--signal-danger)_18%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_96%,white_4%),var(--background))] p-4">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-border/80 bg-card/95 p-8 shadow-sm">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-foreground">⚠️ Algo salió mal</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Ocurrió un error inesperado. No es tu culpa. Intenta de nuevo.
          </p>
          
          <div className="mb-6 rounded-lg border border-signal-danger/30 bg-signal-danger/12 p-4 text-left">
            <p className="break-words font-mono text-xs text-foreground">
              {error.message || "Error desconocido"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2 font-semibold text-secondary-foreground transition hover:bg-secondary/80"
            >
              🏠 Inicio
            </button>
          </div>
        </div>

        {/* Debug info (only in dev) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 rounded border border-border bg-muted/40 p-4 text-xs">
            <p className="mb-2 font-bold text-foreground">🐛 Debug Info:</p>
            <pre className="max-h-32 overflow-auto text-muted-foreground">
              {JSON.stringify(
                {
                  message: error.message,
                  digest: error.digest,
                  NODE_ENV: process.env.NODE_ENV,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
