export type CrisisSupportResource = {
  id: string;
  label: string;
  phone: string;
  region: string;
  description: string;
  url?: string;
};

export const PRODUCT_DISCLAIMERS = [
  "Luciernaga AI no sustituye terapia, diagnostico, atencion medica ni intervencion psicologica de emergencia.",
  "Usa la plataforma de forma responsable. Si hay riesgo alto o crisis, prioriza ayuda humana inmediata.",
] as const;

export const RESPONSIBLE_USE_NOTES = [
  "La IA puede orientar y empujar a la accion, pero no reemplaza evaluacion clinica ni soporte profesional.",
  "En riesgo inmediato, contacta servicios de emergencia o una linea de ayuda antes de seguir conversando.",
] as const;

export const CRISIS_SUPPORT_RESOURCES: CrisisSupportResource[] = [
  {
    id: "es-024",
    label: "024",
    phone: "024",
    region: "Espana",
    description: "Linea de atencion a la conducta suicida 24/7.",
    url: "https://www.sanidad.gob.es/va/linea024/proteccion-de-datos/home.htm",
  },
  {
    id: "us-988",
    label: "988",
    phone: "988",
    region: "Estados Unidos",
    description: "Suicide & Crisis Lifeline 24/7 por llamada, texto o chat.",
    url: "https://988lifeline.org/help-yourself/youth/",
  },
  {
    id: "eu-112",
    label: "112",
    phone: "112",
    region: "Espana / UE",
    description: "Emergencias inmediatas.",
  },
  {
    id: "us-911",
    label: "911",
    phone: "911",
    region: "Estados Unidos",
    description: "Emergencias inmediatas.",
  },
];

export function formatCrisisResourceLines(): string[] {
  return CRISIS_SUPPORT_RESOURCES.map((resource) => {
    return `${resource.label} (${resource.region}): ${resource.description}`;
  });
}
