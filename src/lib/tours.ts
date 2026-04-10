import type { TourStep } from "@/components/GuidedTour";

/**
 * Tour for the main /app workspace.
 * Order: chat first (what you came for), then tabs, then sidebar context.
 * Sidebar steps (3-6) only work on desktop — GuidedTour auto-skips
 * if the target element is not found (hidden in mobile drawer).
 */
export const APP_TOUR: TourStep[] = [
  {
    target: "[data-tour='chat-input']",
    title: "Empieza aqui",
    body: "Escribe como te sientes o que necesitas resolver. El mentor te guiara paso a paso hacia una accion concreta.",
    placement: "top",
  },
  {
    target: "[data-tour='workspace-tabs']",
    title: "Cuatro espacios, un solo lugar",
    body: "Chat para conversar, Plan para tus objetivos, Check-in para registrar tu dia, y Espejo para ver patrones que repites.",
    placement: "bottom",
  },
  {
    target: "[data-tour='new-conversation']",
    title: "Cada tema, su conversacion",
    body: "Crea conversaciones separadas para distintos temas. Tu historial se guarda automaticamente.",
    placement: "bottom",
  },
  {
    target: "[data-tour='mi-progreso']",
    title: "Tu progreso visible",
    body: "Acciones completadas, racha de dias consecutivos y estado emocional. Se actualiza solo conforme avanzas.",
    placement: "left",
  },
  {
    target: "[data-tour='modo-impulso']",
    title: "Modo Impulso (21 dias)",
    body: "Programa intensivo con diagnostico, retos personalizados y seguimiento diario. Disponible en el plan Pro.",
    placement: "left",
  },
  {
    target: "[data-tour='ajustes']",
    title: "Tus preferencias",
    body: "Tono de la IA, recordatorios, zona horaria, personas de confianza y exportacion de datos. Tambien puedes repetir este tour desde aqui.",
    placement: "bottom",
  },
  {
    target: "[data-tour='feedback']",
    title: "Tu opinion cuenta",
    body: "Si algo no funciona o tienes ideas, usa este boton. Lo leemos todo y nos ayuda a priorizar mejoras.",
    placement: "left",
  },
];

/**
 * Shorter tour for the Impulso section.
 */
export const IMPULSO_TOUR: TourStep[] = [
  {
    target: "[data-tour='impulso-diagnostico']",
    title: "Diagnostico inicial",
    body: "Responde un test rapido para identificar tu perfil emocional. El programa se adapta a ti.",
    placement: "bottom",
  },
  {
    target: "[data-tour='impulso-retos']",
    title: "Retos personalizados",
    body: "Cada reto dura entre 3 y 7 dias. Estan diseñados para romper los patrones que te bloquean.",
    placement: "bottom",
  },
];
