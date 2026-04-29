// Shared constants for the admin marketing dashboard.

export const REFERRAL_REASON_LABEL: Record<string, string> = {
  streak_7d: "Racha 7 días",
  streak_30d: "Racha 30 días",
  goal_complete: "Primer objetivo",
  active_30d: "30 días activo",
  manual: "Manual",
  unknown: "Sin clasificar",
};

export const SEGMENTS = [
  { value: "all", label: "Todos" },
  { value: "active_7d", label: "Activos 7d" },
  { value: "inactive_7d", label: "Inactivos 7d+" },
  { value: "pro", label: "Pro" },
  { value: "free", label: "Free" },
  { value: "crisis", label: "Crisis" },
  { value: "state:bloqueo", label: "Estado: bloqueo" },
  { value: "state:ansiedad", label: "Estado: ansiedad" },
  { value: "state:duda", label: "Estado: duda" },
  { value: "state:claridad", label: "Estado: claridad" },
  { value: "state:neutral", label: "Estado: neutral" },
];
