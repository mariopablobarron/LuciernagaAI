"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Sparkles, ExternalLink, AlertTriangle } from "lucide-react";

type Status = {
  plan: string;
  planLabel: string;
  hasPlan: boolean;
  messagesUsedToday: number;
  messagesRemainingToday: number | null;
  messageLimitPerDay: number | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
};

export function BillingSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"checkout_monthly" | "checkout_annual" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data: Status) => setStatus(data))
      .catch(() => setError("No pudimos cargar tu plan."))
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout(plan: "pro_monthly" | "pro_annual") {
    setBusy(plan === "pro_monthly" ? "checkout_monthly" : "checkout_annual");
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo iniciar el pago");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo abrir el portal");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-500">Cargando plan…</p>
      </section>
    );
  }

  const sub = status?.subscription;
  const renewsOn = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
      <header className="flex items-start gap-3">
        <CreditCard className="w-5 h-5 text-fuchsia-400 mt-1 shrink-0" />
        <div>
          <h2 className="text-lg font-semibold">Tu plan</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Plan actual:{" "}
            <span className="font-medium text-zinc-200">{status?.planLabel ?? "—"}</span>
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status?.hasPlan && sub ? (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Estado</span>
            <span
              className={`font-medium ${
                sub.status === "active" || sub.status === "trialing"
                  ? "text-emerald-400"
                  : sub.status === "past_due"
                  ? "text-amber-400"
                  : "text-zinc-300"
              }`}
            >
              {sub.status}
            </span>
          </div>
          {renewsOn && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">
                {sub.cancelAtPeriodEnd ? "Acceso hasta" : "Se renueva el"}
              </span>
              <span className="text-zinc-200">{renewsOn}</span>
            </div>
          )}
          {sub.cancelAtPeriodEnd && (
            <p className="text-xs text-amber-400">
              Tu suscripción se cancelará al final del periodo. Puedes reactivarla desde el portal.
            </p>
          )}

          <button
            type="button"
            onClick={openPortal}
            disabled={busy !== null}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy === "portal" ? "Abriendo…" : "Gestionar suscripción"}
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Pro: continuidad cross-device, memoria persistente entre sesiones y Modo Impulso.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PlanCard
              title="Mensual"
              price="9€"
              period="/mes"
              cta={busy === "checkout_monthly" ? "Abriendo…" : "Elegir mensual"}
              onClick={() => startCheckout("pro_monthly")}
              disabled={busy !== null}
            />
            <PlanCard
              title="Anual"
              price="79€"
              period="/año"
              highlight="Ahorras 29€"
              cta={busy === "checkout_annual" ? "Abriendo…" : "Elegir anual"}
              onClick={() => startCheckout("pro_annual")}
              disabled={busy !== null}
              featured
            />
          </div>
        </div>
      )}
    </section>
  );
}

function PlanCard({
  title,
  price,
  period,
  highlight,
  cta,
  onClick,
  disabled,
  featured,
}: {
  title: string;
  price: string;
  period: string;
  highlight?: string;
  cta: string;
  onClick: () => void;
  disabled: boolean;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        featured
          ? "border-fuchsia-700 bg-fuchsia-950/20"
          : "border-zinc-800 bg-zinc-950/40"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {featured && <Sparkles className="w-4 h-4 text-fuchsia-400" />}
      </div>
      <p className="mt-1">
        <span className="text-2xl font-bold">{price}</span>
        <span className="text-sm text-zinc-400">{period}</span>
      </p>
      {highlight && <p className="text-xs text-fuchsia-300 mt-0.5">{highlight}</p>}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
          featured
            ? "bg-fuchsia-600 text-white hover:bg-fuchsia-500"
            : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
