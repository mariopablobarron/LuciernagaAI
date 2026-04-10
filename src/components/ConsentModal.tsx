"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onAccept: () => void;
};

export default function ConsentModal({ onAccept }: Props) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAccept() {
    setSaving(true);
    try {
      await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ consent: true }),
      });
      onAccept();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">

        {/* Header */}
        <div>
          <p className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-1">
            Tres Mil Millones de Latidos
          </p>
          <h2 className="text-xl font-bold text-white">Consentimiento informado</h2>
        </div>

        {/* Body */}
        <div className="space-y-3 text-sm text-zinc-400 max-h-64 overflow-y-auto pr-1">
          <p>
            Tres Mil Millones de Latidos es una herramienta de mentoría conversacional basada en inteligencia
            artificial. <strong className="text-white">No es un servicio de salud mental, no
            sustituye la psicoterapia ni la intervención psicológica profesional.</strong>
          </p>
          <p>
            Al continuar, confirmas que:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-500">
            <li>Usas la app para reflexión personal y apoyo en la toma de decisiones.</li>
            <li>En caso de crisis o urgencia, contactarás con un profesional de salud mental.</li>
            <li>Tus conversaciones pueden ser supervisadas por un profesional asignado para tu seguridad.</li>
            <li>Los datos se almacenan de forma segura y no se comparten con terceros sin tu consentimiento.</li>
            <li>Puedes solicitar la eliminación de tus datos en cualquier momento.</li>
          </ul>
          <p>
            <strong className="text-white">Líneas de crisis:</strong> España 024 · EE.UU. 988 ·
            Emergencias 112/911
          </p>
          <p className="text-zinc-500 text-xs">
            Consulta nuestra{" "}
            <a href="/privacy" target="_blank" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">politica de privacidad</a>{" "}
            y los{" "}
            <a href="/terms" target="_blank" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">terminos de uso</a>.
          </p>
          <p className="text-zinc-600 text-xs">
            Version 1.0 · {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-cyan-500"
          />
          <span className="text-sm text-zinc-300">
            He leído y acepto el uso de Tres Mil Millones de Latidos tal como se describe arriba.
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => void handleAccept()}
            disabled={!checked || saving}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {saving ? "Guardando..." : "Acepto y continúo"}
          </Button>
        </div>

        <p className="text-xs text-zinc-700 text-center">
          Si no aceptas, no podrás usar la aplicación.
        </p>
      </div>
    </div>
  );
}
