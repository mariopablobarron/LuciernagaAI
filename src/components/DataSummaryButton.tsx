"use client";

/**
 * Botón ⓘ "¿qué sabemos de ti?" — refuerza anonymous-first con
 * transparencia total. El usuario abre modal y ve EXACTAMENTE qué
 * datos guardamos vinculados a su sesión.
 *
 * UX:
 *  - Pill discreta junto al EmergencyShelter, Incognito, MentorPrefs
 *  - Click → fetch a /api/user/data-summary + modal con la info
 *  - Si no se ha conectado (sesión recién creada), muestra "todavía nada"
 *  - Link a /settings para acciones (cambiar email, borrar cuenta) ya
 *    existentes — no duplicamos esa funcionalidad aquí.
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Info, X, Loader2, Download } from "lucide-react";
import { exportToMarkdown, downloadAsFile } from "@/lib/exportToMarkdown";

type Summary = {
  isAnonymous: boolean;
  email: string | null;
  name: string | null;
  locale: string;
  ageRange: string | null;
  createdAt: string;
  conversationsCount: number;
  messagesCount: number;
  hasActiveGoal: boolean;
};

type State = "idle" | "loading" | "loaded" | "error";
type ExportState = "idle" | "downloading" | "done" | "error";
type AutoDeleteState = "idle" | "saving" | "error";

export function DataSummaryButton() {
  const t = useTranslations("dataSummary");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [exportState, setExportState] = useState<ExportState>("idle");
  // Toggle "borrar mis datos si no vuelvo en 30d" — sincronizado con BD.
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState<boolean | null>(null);
  const [autoDeleteState, setAutoDeleteState] = useState<AutoDeleteState>("idle");

  const fetchSummary = useCallback(async () => {
    setState("loading");
    try {
      const [resSummary, resAutoDelete] = await Promise.all([
        fetch("/api/user/data-summary", { credentials: "include" }),
        fetch("/api/user/auto-delete", { credentials: "include" }),
      ]);
      if (!resSummary.ok) throw new Error(`HTTP ${resSummary.status}`);
      const data = (await resSummary.json()) as Summary;
      setSummary(data);
      if (resAutoDelete.ok) {
        const ad = (await resAutoDelete.json()) as { enabled: boolean };
        setAutoDeleteEnabled(ad.enabled);
      }
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  // Persiste el toggle de auto-borrado en la BD vía endpoint.
  // Optimistic UI: el switch responde al instante; si el fetch falla,
  // revertimos y mostramos error.
  const toggleAutoDelete = useCallback(async (next: boolean) => {
    const prev = autoDeleteEnabled;
    setAutoDeleteEnabled(next);
    setAutoDeleteState("saving");
    try {
      const res = await fetch("/api/user/auto-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAutoDeleteState("idle");
    } catch {
      setAutoDeleteEnabled(prev);
      setAutoDeleteState("error");
      setTimeout(() => setAutoDeleteState("idle"), 3000);
    }
  }, [autoDeleteEnabled]);

  const openModal = useCallback(() => {
    setOpen(true);
    if (state === "idle" || state === "error") void fetchSummary();
  }, [state, fetchSummary]);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  // Descargar todos los datos del usuario como Markdown (.md).
  // Reutiliza el endpoint GDPR existente /api/user/export y convierte
  // en cliente para no añadir formato server-side.
  const downloadMarkdown = useCallback(async () => {
    setExportState("downloading");
    try {
      const res = await fetch("/api/user/export?format=json", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const md = exportToMarkdown(data, locale);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadAsFile(md, `tres-mil-millones-${stamp}.md`);
      setExportState("done");
      setTimeout(() => setExportState("idle"), 3000);
    } catch {
      setExportState("error");
      setTimeout(() => setExportState("idle"), 3000);
    }
  }, [locale]);

  // Formatear fecha de creación según locale del usuario.
  const formatCreatedAt = useCallback((iso: string): string => {
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale, {
        dateStyle: "medium",
      }).format(date);
    } catch {
      return iso.slice(0, 10);
    }
  }, [locale]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={t("trigger")}
        title={t("trigger")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900/50 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/60 transition-colors"
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t("trigger")}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("modalTitle")}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md px-4"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label={t("close")}
              className="absolute top-3 right-3 p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>

            <h3 className="text-base font-semibold text-white mb-1">{t("modalTitle")}</h3>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">{t("modalSubtitle")}</p>

            {state === "loading" && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" aria-hidden="true" />
              </div>
            )}

            {state === "error" && (
              <div className="rounded-xl border border-red-700/30 bg-red-950/20 p-3">
                <p className="text-xs text-red-300">{t("error")}</p>
                <button
                  type="button"
                  onClick={() => void fetchSummary()}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 underline underline-offset-4"
                >
                  {t("retry")}
                </button>
              </div>
            )}

            {state === "loaded" && summary && (
              <>
                {/* Estado de identidad: anónimo vs con email */}
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-3 mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                    {t("fields.identity")}
                  </p>
                  <p className="text-sm font-medium text-zinc-100">
                    {summary.isAnonymous ? t("identity.anonymous") : (summary.email ?? t("identity.unknown"))}
                  </p>
                  {summary.name ? (
                    <p className="text-xs text-zinc-500 mt-0.5">{summary.name}</p>
                  ) : null}
                </div>

                {/* Datos: locale, edad, fecha creación */}
                <dl className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-3">
                    <dt className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                      {t("fields.locale")}
                    </dt>
                    <dd className="text-sm font-medium text-zinc-100">{summary.locale.toUpperCase()}</dd>
                  </div>
                  <div className="rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-3">
                    <dt className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                      {t("fields.ageRange")}
                    </dt>
                    <dd className="text-sm font-medium text-zinc-100">
                      {summary.ageRange ?? t("fields.notProvided")}
                    </dd>
                  </div>
                  <div className="col-span-2 rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-3">
                    <dt className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                      {t("fields.createdAt")}
                    </dt>
                    <dd className="text-sm font-medium text-zinc-100">{formatCreatedAt(summary.createdAt)}</dd>
                  </div>
                </dl>

                {/* Actividad */}
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-3 mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                    {t("fields.activity")}
                  </p>
                  <p className="text-sm text-zinc-100">
                    {t("activity.conversations", { n: summary.conversationsCount })} · {t("activity.messages", { n: summary.messagesCount })}
                  </p>
                  {summary.hasActiveGoal ? (
                    <p className="text-xs text-zinc-500 mt-1">{t("activity.activeGoal")}</p>
                  ) : null}
                </div>

                {/* Auto-borrado opcional: si no vuelvo en 30 días, borradme.
                    Anonymous-first reforzado para usuarios que prueban y no
                    quieren dejar rastro si no continúan. */}
                {autoDeleteEnabled !== null ? (
                  <label className="flex items-start gap-3 cursor-pointer mb-3 rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-3">
                    <input
                      type="checkbox"
                      checked={autoDeleteEnabled}
                      onChange={(e) => void toggleAutoDelete(e.target.checked)}
                      disabled={autoDeleteState === "saving"}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100">
                        {t("autoDelete.label")}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {t("autoDelete.description")}
                      </p>
                      {autoDeleteState === "error" ? (
                        <p className="text-[10px] text-red-400 mt-1">{t("autoDelete.error")}</p>
                      ) : null}
                    </div>
                  </label>
                ) : null}

                {/* Descargar todos los datos en Markdown — derecho a portabilidad. */}
                <button
                  type="button"
                  onClick={() => void downloadMarkdown()}
                  disabled={exportState === "downloading"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-700 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                  {exportState === "downloading" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {exportState === "downloading"
                      ? t("export.downloading")
                      : exportState === "done"
                        ? t("export.done")
                        : exportState === "error"
                          ? t("export.error")
                          : t("export.cta")}
                  </span>
                </button>

                <p className="text-[10px] text-zinc-600 leading-relaxed">
                  {t("disclosure")}{" "}
                  <Link
                    href="/settings"
                    className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
                  >
                    {t("manageDataLink")}
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
