"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Trash2, AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { CURRENT_CONSENT_VERSION } from "@/lib/legal";

type ConsentStatus = {
  consentGiven: boolean;
  consentVersion: string | null;
  consentAt: string | null;
};

export function PrivacySettings() {
  const [isExporting, setIsExporting] = useState<"csv" | "json" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [reaccepting, setReaccepting] = useState(false);

  useEffect(() => {
    fetch("/api/user/consent-status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.consentGiven !== undefined) setConsent(data as ConsentStatus);
      })
      .catch(() => {});
  }, []);

  const handleReaccept = async () => {
    setReaccepting(true);
    try {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentVersion: CURRENT_CONSENT_VERSION }),
      });
      if (res.ok) {
        setConsent({
          consentGiven: true,
          consentVersion: CURRENT_CONSENT_VERSION,
          consentAt: new Date().toISOString(),
        });
      }
    } finally {
      setReaccepting(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(format);
    try {
      // El navegador manejará la descarga automáticamente gracias al header Content-Disposition
      window.location.href = `/api/user/export?format=${format}`;
    } catch {
      // Export error handled by browser
    } finally {
      // Pequeño timeout para restablecer el botón
      setTimeout(() => setIsExporting(null), 1500);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
      });

      if (res.ok) {
        // Redirigir a la landing page tras borrar la cuenta
        window.location.href = "/";
      } else {
        alert("Hubo un problema al eliminar tu cuenta. Por favor contacta a soporte.");
      }
    } catch {
      // Delete error handled by alert above
    } finally {
      setIsDeleting(false);
    }
  };

  const consentOutdated = consent?.consentGiven && consent.consentVersion !== CURRENT_CONSENT_VERSION;

  return (
    <div className="w-full max-w-2xl space-y-8 bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-xl text-zinc-100">
      {/* Estado del consentimiento */}
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Consentimiento
        </h2>
        {consent === null ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : !consent.consentGiven ? (
          <p className="text-sm text-amber-400">No tenemos registro de aceptación de los términos. Esto no debería pasar — contacta soporte.</p>
        ) : (
          <div className="text-sm text-zinc-400 space-y-1">
            <p>
              Aceptaste la versión{' '}
              <span className="font-mono text-zinc-200">{consent.consentVersion ?? '(legacy)'}</span>
              {consent.consentAt ? ` el ${new Date(consent.consentAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}` : ''}.
            </p>
            <p className="text-xs text-zinc-500">
              Versión actual:{' '}
              <Link href="/terms" target="_blank" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Términos</Link>
              {' / '}
              <Link href="/privacy" target="_blank" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Privacidad</Link>
              {' '}<span className="font-mono">{CURRENT_CONSENT_VERSION}</span>.
            </p>
            {consentOutdated && (
              <button
                onClick={handleReaccept}
                disabled={reaccepting}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {reaccepting ? 'Guardando…' : `Aceptar la versión ${CURRENT_CONSENT_VERSION}`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-px w-full bg-zinc-800" />

      {/* Sección Portabilidad (Descarga de datos) */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Tus Datos</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Tienes derecho a acceder a tu información (Art. 20 RGPD). Puedes descargar tu historial de
          conversaciones en un formato fácil de leer (CSV/Excel) o descargar la totalidad de tus
          datos de perfil, metas y emociones en formato JSON.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleExport("csv")}
            disabled={isExporting !== null}
            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            {isExporting === "csv" ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Historial de Chat (CSV)
          </button>

          <button
            onClick={() => handleExport("json")}
            disabled={isExporting !== null}
            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            {isExporting === "json" ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Datos Completos (JSON)
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-zinc-800" />

      {/* Sección Derecho al Olvido (Borrar Cuenta) */}
      <div>
        <h2 className="text-xl font-semibold text-red-500 mb-2">Eliminar Cuenta</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Al eliminar tu cuenta, destruiremos permanentemente todo tu historial, metas y perfil
          emocional de nuestros servidores. Esta acción no se puede deshacer.
        </p>

        {!showConfirmDelete ? (
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="flex items-center justify-center gap-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">
                ¿Estás completamente seguro? Perderás todo tu avance.
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Borrando..." : "Sí, borrar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
