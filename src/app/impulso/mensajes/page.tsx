"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Unlock, MessageSquare } from "lucide-react";
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from "@/styles/design-system";

export default function MensajesPage() {
  const mensajes = [
    {
      day: 1,
      title: "Tu primer día",
      preview: "El hecho de que estés aquí significa que algo en ti quiere cambiar...",
      locked: false,
      status: "completado",
    },
    {
      day: 3,
      title: "El enjambre de dudas",
      preview: "Alrededor del día 3, la mente intenta sabotearte...",
      locked: false,
      status: "completado",
    },
    {
      day: 7,
      title: "Tu primera semana",
      preview: "Hiciste un cambio en el patrón. Esto es real. Ahora viene lo difícil...",
      locked: false,
      status: "desbloqueado",
    },
    {
      day: 10,
      title: "La meseta",
      preview: "Ahora el cambio se siente normal. Muchos abandonan aquí...",
      locked: true,
      status: "bloqueado",
    },
    {
      day: 14,
      title: "Punto de quiebre",
      preview: "Aquí es donde muchos recaen. Pero tú tienes herramientas que antes no tenías...",
      locked: true,
      status: "bloqueado",
    },
    {
      day: 18,
      title: "Recta final",
      preview: "Solo 3 días. Sientes que puedes con esto. Y es verdad...",
      locked: true,
      status: "bloqueado",
    },
    {
      day: 21,
      title: "Tu nuevo hábito",
      preview: "Felicitaciones. Ahora el cambio es tuyo. ¿Qué sigue?",
      locked: true,
      status: "bloqueado",
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/impulso" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`${TYPOGRAPHY.h1} text-white`}>Mensajes del programa</h1>
            <p className="text-zinc-400">Mensajes personalizados en puntos clave de tu viaje</p>
          </div>
        </div>

        {/* Progress Info */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Progreso del programa</p>
              <p className="text-2xl font-bold text-white">Día 9 de 21</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-cyan-400">43%</p>
              <p className="text-xs text-zinc-500">completado</p>
            </div>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-[43%] bg-gradient-to-r from-violet-500 to-cyan-400" />
          </div>
        </div>

        {/* Messages Timeline */}
        <div className="space-y-4">
          {mensajes.map((mensaje, i) => (
            <div
              key={i}
              className={`${COMPONENTS.card} p-6 space-y-3 relative transition-all ${
                mensaje.locked ? "opacity-75" : ""
              }`}
            >
              {mensaje.locked && (
                <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40 rounded-2xl flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white opacity-50" />
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50">
                      <span className="text-xs font-bold text-cyan-400">{mensaje.day}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{mensaje.title}</h3>
                  </div>

                  {!mensaje.locked ? (
                    <p className="text-sm text-zinc-300 italic">&quot;{mensaje.preview}&quot;</p>
                  ) : (
                    <p className="text-sm text-zinc-500">Se desbloquea el día {mensaje.day}</p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {mensaje.locked ? (
                    <Lock className="w-5 h-5 text-zinc-600" />
                  ) : (
                    <Unlock className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
              </div>

              {!mensaje.locked && (
                <div className="pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    disabled
                    title="Aún no disponible"
                    aria-disabled="true"
                    className="text-xs font-semibold text-cyan-400 opacity-50 cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Leer mensaje completo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div
          className={`${COMPONENTS.card} p-8 space-y-4 text-center bg-zinc-900/50 border-l-4 border-l-violet-500`}
        >
          <h3 className={`${TYPOGRAPHY.h3} text-white`}>Sobre estos mensajes</h3>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Cada mensaje está diseñado para apoyarte en momentos específicos de tu viaje de 21 días.
            Son reflexiones personalizadas basadas en patrones reales de transformación.
          </p>
          <p className="text-xs text-zinc-500">
            Los mensajes se desbloquean automáticamente cuando llegas a cada día del programa.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/impulso/checkin"
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center justify-center gap-2`}
          >
            Hacer check-in de hoy
          </Link>
          <Link
            href="/impulso"
            className={`${COMPONENTS.buttonSecondary} inline-flex items-center justify-center gap-2`}
          >
            Volver al programa
          </Link>
        </div>
      </div>
    </div>
  );
}
