import type { TourStep } from "@/components/GuidedTour";

/**
 * Tour for the main /app workspace — first-time users.
 * 5 steps: chat → tabs → diario/comunidad → impulso → progreso.
 * Sidebar steps auto-skip if target is hidden (mobile drawer).
 */
export const APP_TOUR: TourStep[] = [
  {
    target: "[data-tour='chat-input']",
    title: "1. Empieza aqui",
    body: "Escribe como te sientes o que necesitas resolver. El mentor te hara preguntas para que descubras tu siguiente paso.",
    placement: "top",
  },
  {
    target: "[data-tour='workspace-tabs']",
    title: "2. Cuatro espacios",
    body: "Chat para conversar, Plan para tus objetivos, Check-in para registrar tu dia, y Espejo para ver patrones.",
    placement: "bottom",
  },
  {
    target: "[data-tour='nav-buttons']",
    title: "3. Tu caja de herramientas",
    body: "Diario para escribir libremente, Respirar para calmar la ansiedad, Logros para celebrar avances, y Explorar para ejercicios guiados.",
    placement: "bottom",
  },
  {
    target: "[data-tour='comunidad']",
    title: "4. No estas solo",
    body: "Conecta con personas en tu misma situacion. Victorias, reflexiones anonimas y espacios de apoyo mutuo.",
    placement: "left",
  },
  {
    target: "[data-tour='modo-impulso']",
    title: "5. Modo Impulso",
    body: "Programa de 21 dias con diagnostico, retos personalizados y seguimiento diario. Para cuando quieras ir en serio.",
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
    body: "Cada reto dura entre 3 y 7 dias. Estan disenados para romper los patrones que te bloquean.",
    placement: "bottom",
  },
];
