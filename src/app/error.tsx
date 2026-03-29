"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to server
    console.error("[ERROR-BOUNDARY] 💥 Uncaught Error:", error.message);
    console.error("[ERROR-BOUNDARY] Stack:", error.stack);
    console.error("[ERROR-BOUNDARY] Digest:", error.digest);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-2">⚠️ Algo salió mal</h1>
          <p className="text-gray-600 text-sm mb-6">
            Ocurrió un error inesperado. No es tu culpa. Intenta de nuevo.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-red-700 font-mono break-words">
              {error.message || "Error desconocido"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
            >
              🏠 Inicio
            </button>
          </div>
        </div>

        {/* Debug info (only in dev) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 bg-gray-100 p-4 rounded text-xs">
            <p className="font-bold text-gray-700 mb-2">🐛 Debug Info:</p>
            <pre className="text-gray-600 overflow-auto max-h-32">
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
