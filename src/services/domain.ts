/**
 * Detector de DOMINIO del problema/emoción que el usuario está nombrando.
 *
 * Eje complementario a `detectIntent`: el intent dice QUÉ quiere hacer el
 * usuario en el chat (compartir problema, pedir aclaración, marcar acción
 * hecha), el dominio dice DE QUÉ ÁREA habla (pareja, trabajo, salud, etc.).
 *
 * Inspirado en la taxonomía de intents emocionales de
 * paritoshtripathi935/aishikabot (`how_you_feel`, `why_you_feel`,
 * `religious`, `cultural`, `academic`, etc.) — adaptado al contexto
 * real del producto: dominios que el mentor reconoce como vectores
 * causales habituales en conversaciones reales.
 *
 * El dominio se mete en el coachContext y permite al system prompt
 * adaptar registro (no se pregunta igual sobre la pareja que sobre un
 * concurso de oposiciones), proponer recursos contextuales (psicólogo
 * vs orientación laboral), y en el futuro alimentar segmentación de
 * insights y broadcast.
 */

export type ProblemDomain =
  | "relational" // pareja, familia, amistades, conflictos personales
  | "work" // trabajo, carrera, jefe, despido, cambio profesional
  | "academic" // estudios, exámenes, oposición, tesis, formación
  | "health" // salud física, somático, sueño, energía, dolor
  | "financial" // dinero, deudas, decisiones económicas
  | "existential" // sentido vital, identidad, propósito, espiritualidad
  | "family_role" // ser madre/padre/hijo/cuidador, roles familiares
  | "social" // soledad, pertenencia, integración, redes sociales
  | "creative" // proyecto creativo, bloqueo creativo, expresión
  | null; // no detectable o demasiado genérico

function normalize(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DOMAIN_PATTERNS: Record<NonNullable<ProblemDomain>, RegExp[]> = {
  relational: [
    /\b(pareja|novio|novia|marido|mujer|esposa|esposo|relacion|ruptura|separacion|divorcio|infidelidad)\b/,
    /\b(amistad|amigo|amiga|conflicto con|discusion|pelea con|me ha dejado|me ha bloqueado)\b/,
  ],
  work: [
    /\b(trabajo|curro|empleo|jefe|jefa|empresa|oficina|colega|compañer[oa] de trabajo)\b/,
    /\b(despido|despedid[oa]|paro|en paro|ascenso|carrera profesional|cambiar de trabajo)\b/,
    /\b(reunion|proyecto laboral|cliente)\b/,
  ],
  academic: [
    /\b(examen|estudio|estudiar|carrera|universidad|grado|master|doctorado|tesis|tfg|tfm)\b/,
    /\b(oposicion|opositor|oposiciones|notas|aprobar|suspender|matricula|asignatura)\b/,
    /\b(profesor|profesora|alumnos|aula|clase de|me presento al)\b/,
  ],
  health: [
    /\b(salud|enferm[oa]|enfermedad|medico|hospital|operacion|cirugia|dolor|cansancio fisico)\b/,
    /\b(no duermo|insomnio|me duele|sin energia|fatiga|cuerpo|migraña|dolor de cabeza)\b/,
    /\b(diagnostico|sintomas|tratamiento|medicacion|pastillas|terapia fisica)\b/,
  ],
  financial: [
    /\b(dinero|deuda|deudas|hipoteca|alquiler|sueldo|salario|nomina|sin pasta|sin dinero|ahorr[oa]r)\b/,
    /\b(prestamo|credito|banco|factura|paga|cobrar|cuenta corriente)\b/,
  ],
  existential: [
    /\bsentido de (la|mi|tu) vida\b/,
    /\b(para|por) que (vivo|estoy aqui|sigo aqui)\b/,
    /\b(proposito|crisis existencial|crisis de fe|en que creer)\b/,
    /\b(identidad|quien soy|no se quien soy|me he perdido|valores|creencias)\b/,
    /\b(espiritual|religion|dios|trascendente|alma)\b/,
  ],
  family_role: [
    /\b(mi madre|mi padre|mis padres|mi hij[oa]|mis hijos|hermano|hermana|abuel[oa])\b/,
    /\b(cuidador|cuidadora|cuidar a|mi familia|mi clan|familia toxica|mi tia|mi tio)\b/,
    /\b(ser padre|ser madre|maternidad|paternidad|crianza)\b/,
  ],
  social: [
    /\b(soledad|sin amigos|nadie me|sin apoyo|aislad[oa])\b/,
    /\bme siento (muy |bastante |tan |un poco )?sol[oa]\b/,
    /\b(no encajo|no tengo a nadie|me falta gente|no conecto con|me siento fuera)\b/,
  ],
  creative: [
    /\b(creatividad|bloqueo creativo|escribir|pintar|componer|libro|novela|cancion|disco)\b/,
    /\b(arte|artista|proyecto creativo|creacion|inspiracion|sin ideas)\b/,
  ],
};

// Cuando varios dominios matchean, este orden decide cuál gana.
// Más específico/causal arriba; más genérico abajo.
// family_role va antes que health: cuando hay "mi madre enferma" la causa
// del problema del usuario es el ROL (cuidador) más que la enfermedad ajena.
// financial va antes que work: keywords como "hipoteca" o "deuda" son más
// específicas que "trabajo" en frases que mezclan ambos.
const DOMAIN_PRIORITY: NonNullable<ProblemDomain>[] = [
  "academic",
  "financial",
  "family_role",
  "health",
  "work",
  "relational",
  "creative",
  "existential",
  "social",
];

export function detectDomain(message: string): ProblemDomain {
  const normalized = normalize(message);
  if (normalized.length === 0) return null;

  for (const domain of DOMAIN_PRIORITY) {
    if (DOMAIN_PATTERNS[domain].some((p) => p.test(normalized))) {
      return domain;
    }
  }
  return null;
}

export const DOMAIN_LABELS: Record<NonNullable<ProblemDomain>, string> = {
  relational: "relacional (pareja/amistades)",
  work: "trabajo y carrera",
  academic: "estudios y formación",
  health: "salud física",
  financial: "dinero y finanzas",
  existential: "sentido vital / identidad",
  family_role: "rol familiar",
  social: "soledad / pertenencia",
  creative: "proyecto creativo",
};

/**
 * Pista que se inyecta al system prompt del coach cuando el dominio
 * es claro. NO sobrescribe nada — solo da contexto para adaptar registro.
 * Mantenido conservador: el coach sabrá qué hacer con la etiqueta.
 */
export function buildDomainGuidance(domain: ProblemDomain): string {
  if (!domain) return "";
  const label = DOMAIN_LABELS[domain];
  return `Dominio detectado del problema actual: ${label}. Adapta el registro a esta área (no preguntas igual sobre pareja que sobre oposiciones). Si necesitas proponer un recurso externo, hazlo coherente con el dominio (psicología clínica para relacional/existencial, orientación laboral para work, médico para health, asesor financiero para financial). NO menciones la etiqueta literal al usuario.`;
}
