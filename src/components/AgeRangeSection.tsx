"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import {
  AGE_RANGES,
  AGE_RANGE_LABELS,
  isAgeRange,
  rangeToTier,
  type AgeRange,
} from "@/lib/age-range";

/**
 * Sección de ajustes para cambiar el rango etario declarado.
 *
 * Diseño:
 *   - GET /api/auth/age-state para conocer el actual.
 *   - POST /api/auth/declare-age con el nuevo bucket (sin permitir under_14
 *     desde aquí — un usuario logueado no puede auto-bloquearse por error).
 *   - Aviso si el cambio cruza el tier (minor↔adult) — afecta el tono del coach.
 */
export default function AgeRangeSection() {
  const [current, setCurrent] = useState<AgeRange | null>(null);
  const [selected, setSelected] = useState<AgeRange | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/age-state", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { kind: string; ageRange?: string };
        if (cancelled) return;
        if (json.kind === "declared" && json.ageRange && isAgeRange(json.ageRange)) {
          setCurrent(json.ageRange);
          setSelected(json.ageRange);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!selected || selected === current) return;
    const crossesTier =
      current && rangeToTier(current) !== rangeToTier(selected);

    if (crossesTier) {
      const confirmed = window.confirm(
        `Vas a cambiar de "${current ? AGE_RANGE_LABELS[current] : ""}" a "${AGE_RANGE_LABELS[selected]}". El tono con el que te habla el coach cambiará. ¿Continuar?`,
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/declare-age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selected }),
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("No se pudo guardar el cambio");
        return;
      }
      setCurrent(selected);
      toast.success("Rango actualizado");
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Rango de edad</h2>
          <p className="text-xs text-zinc-500">
            Afecta el tono con el que te habla el coach. Solo guardamos un rango — no la edad exacta.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AGE_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                disabled={saving}
                onClick={() => setSelected(r)}
                className={`rounded-xl border px-4 py-2.5 text-sm text-left transition disabled:opacity-50 ${
                  selected === r
                    ? "border-violet-500/60 bg-violet-500/10 text-white"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                {AGE_RANGE_LABELS[r]}
                {current === r ? (
                  <span className="ml-2 text-[10px] text-zinc-500">(actual)</span>
                ) : null}
              </button>
            ))}
          </div>

          {selected && selected !== current ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-violet-500 hover:bg-violet-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Guardar cambio
            </button>
          ) : null}

          {!current ? (
            <p className="text-xs text-amber-400/80">
              Aún no has declarado un rango. La próxima vez que entres al chat te lo preguntaremos.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
