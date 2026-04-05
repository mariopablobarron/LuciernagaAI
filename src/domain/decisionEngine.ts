import type { Decision, Insight, SystemState } from "@/domain/types";

export function generateDecision(state: SystemState, insight: Insight): Decision {
  if (state === "CRISIS") {
    return {
      type: "ESCALAR_CRISIS",
      reason: "Se detectaron señales de riesgo alto o crítico.",
      confidence: "high",
      recommendedActions: [
        "Activar protocolo de contención inmediato.",
        "Priorizar mensajes de seguridad y recursos de ayuda.",
        "Notificar al panel admin para seguimiento manual.",
      ],
    };
  }

  if (state === "BLOQUEADO") {
    return {
      type: "DESTRABAR_BLOQUEO",
      reason: "La retención temprana y/o adherencia diaria muestran fricción alta.",
      confidence: insight.retentionDay3 < 0.25 ? "high" : "medium",
      recommendedActions: [
        "Reducir carga cognitiva a una sola microacción.",
        "Usar prompts de enfoque de 5-10 minutos.",
        "Eliminar pasos opcionales en onboarding conversacional.",
      ],
    };
  }

  if (state === "EVASIVO") {
    return {
      type: "REDUCIR_EVASION",
      reason: "La evitación está por encima del umbral operativo.",
      confidence: insight.avoidanceRate >= 0.7 ? "high" : "medium",
      recommendedActions: [
        "Elevar confrontación empática sobre compromisos abiertos.",
        "Detectar y marcar desvíos de conversación con reencuadre.",
        "Solicitar evidencia concreta de ejecución al cierre.",
      ],
    };
  }

  if (state === "ACTIVO") {
    return {
      type: "ACELERAR_ACCION",
      reason: "Hay ejecución sostenida y baja fricción operativa.",
      confidence: "medium",
      recommendedActions: [
        "Incrementar dificultad progresiva de acciones.",
        "Introducir objetivos semanales con hitos diarios.",
        "Reforzar wins para sostener momentum.",
      ],
    };
  }

  if (state === "TRANSITIONAL_VOID") {
    return {
      type: "SOSTENER_VACIO",
      reason: "El usuario está en una transición de identidad sin dirección clara.",
      confidence: "high",
      recommendedActions: [
        "IDENTIFY_WHAT_ENDED: Identifica qué parte de tu vida ya no encaja",
        "DETECT_ESCAPE: Detecta qué estás intentando resolver demasiado rápido",
        "ALLOW_UNCERTAINTY: Permítete no decidir hoy",
      ],
    };
  }

  return {
    type: "MANTENER_RUMBO",
    reason: "El sistema está estable sin señales críticas activas.",
    confidence: "low",
    recommendedActions: [
      "Mantener estrategia actual y monitoreo continuo.",
      "Reevaluar estado con ventana móvil de 7 días.",
      "Ajustar prompts de manera incremental.",
    ],
  };
}
