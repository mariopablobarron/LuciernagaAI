import type { TourStep } from "@/components/GuidedTour";

/**
 * Tour for the main /app workspace.
 * Each step points at an element with a data-tour attribute.
 */
export const APP_TOUR: TourStep[] = [
  {
    target: "[data-tour='chat-input']",
    title: "Empieza aquí",
    body: "Escribe cómo te sientes o qué necesitas resolver. El mentor te guiará paso a paso hacia una acción concreta.",
    placement: "top",
  },
  {
    target: "[data-tour='workspace-tabs']",
    title: "Cuatro espacios, un solo lugar",
    body: "Chat para conversar, Plan para tus objetivos, Check-in para registrar tu día, y Espejo para ver patrones que repites.",
    placement: "bottom",
  },
  {
    target: "[data-tour='new-conversation']",
    title: "Cada tema, su conversación",
    body: "Puedes crear conversaciones separadas para distintos temas. Tu historial se guarda automáticamente.",
    placement: "bottom",
  },
  {
    target: "[data-tour='mi-progreso']",
    title: "Tu progreso visible",
    body: "Aquí ves tus acciones completadas, tu racha de días consecutivos y tu estado emocional. Todo se actualiza solo.",
    placement: "left",
  },
  {
    target: "[data-tour='modo-impulso']",
    title: "Modo Impulso (21 días)",
    body: "Un programa intensivo con diagnóstico, retos personalizados y seguimiento diario. Disponible en el plan Pro.",
    placement: "left",
  },
];

/**
 * Shorter tour for the Impulso section.
 */
export const IMPULSO_TOUR: TourStep[] = [
  {
    target: "[data-tour='impulso-diagnostico']",
    title: "Diagnóstico inicial",
    body: "Responde un test rápido para identificar tu perfil emocional. El programa se adapta a ti.",
    placement: "bottom",
  },
  {
    target: "[data-tour='impulso-retos']",
    title: "Retos personalizados",
    body: "Cada reto dura entre 3 y 7 días. Están diseñados para romper los patrones que te bloquean.",
    placement: "bottom",
  },
];
