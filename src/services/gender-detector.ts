/**
 * Detector pasivo de género gramatical preferido a partir de un mensaje del usuario.
 *
 * Solo detecta autodeclaraciones explícitas tipo "soy una mujer / hombre / persona no-binaria".
 * Por defecto devuelve null — preferimos no inferir nada.
 *
 * NO infiere por nombre, contexto u otros señales — riesgo alto de equivocar
 * y ofender. La detección conversacional es complementaria a la elección
 * manual en /settings, no la sustituye.
 */

export type DetectedGender = "feminine" | "masculine" | "neutral";

const NORMALIZE = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Frases que invalidan la detección (negaciones, hipotéticas, comparaciones)
const NEGATION_NEAR = /\b(no|nunca|jamas|tampoco|si fuera|si fuese|como si|me dicen que soy|me llaman|piensan que soy)\b/;

// Patrones de detección — solo first person + identidad
const FEMININE_PATTERNS: RegExp[] = [
  /\bsoy (una )?mujer\b/,
  /\bsoy (una )?chica\b/,
  /\bsoy una persona femenina\b/,
  /\bmis pronombres son ella\b/,
  /\bme identifico como mujer\b/,
  /\bprefiero (que me hablen|el trato|que me trates) en femenino\b/,
  /\bdirigete a mi en femenino\b/,
  /\btratame en femenino\b/,
  /\bhablame en femenino\b/,
  // typo común sin -m
  /\bsoy una chic[ae]\b/,
];

const MASCULINE_PATTERNS: RegExp[] = [
  /\bsoy (un )?hombre\b/,
  /\bsoy (un )?chico\b/,
  /\bsoy una persona masculina\b/,
  /\bmis pronombres son el\b/, // "él" sin tilde tras NORMALIZE
  /\bme identifico como hombre\b/,
  /\bprefiero (que me hablen|el trato|que me trates) en masculino\b/,
  /\bdirigete a mi en masculino\b/,
  /\btratame en masculino\b/,
  /\bhablame en masculino\b/,
];

const NEUTRAL_PATTERNS: RegExp[] = [
  /\bsoy no binari[oa]\b/,
  /\bsoy no-binari[oa]\b/,
  /\bsoy una persona no binaria\b/,
  /\bsoy una persona no-binaria\b/,
  /\bmis pronombres son elle\b/,
  /\bprefiero (que me hablen|el trato|que me trates) en neutro\b/,
  /\bdirigete a mi en (neutro|lenguaje neutro)\b/,
  /\btratame en (neutro|lenguaje neutro)\b/,
  /\bhablame en (neutro|lenguaje neutro)\b/,
  /\bme identifico como no binari[oa]\b/,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function hasNegationNear(text: string, idx: number): boolean {
  const window = text.slice(Math.max(0, idx - 30), idx);
  return NEGATION_NEAR.test(window);
}

function findFirstMatchIdx(text: string, patterns: RegExp[]): number {
  let min = -1;
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m.index !== undefined) {
      if (min === -1 || m.index < min) min = m.index;
    }
  }
  return min;
}

/**
 * Devuelve el género detectado en el mensaje, o null si no hay autodeclaración
 * inequívoca. Solo se considera positivo si NO hay negación cerca.
 */
export function detectGenderInMessage(message: string): DetectedGender | null {
  if (!message || message.length < 5) return null;

  const text = NORMALIZE(message);

  const fIdx = findFirstMatchIdx(text, FEMININE_PATTERNS);
  const mIdx = findFirstMatchIdx(text, MASCULINE_PATTERNS);
  const nIdx = findFirstMatchIdx(text, NEUTRAL_PATTERNS);

  // Recolectar candidatos no negados
  const candidates: { gender: DetectedGender; idx: number }[] = [];
  if (fIdx >= 0 && !hasNegationNear(text, fIdx)) candidates.push({ gender: "feminine", idx: fIdx });
  if (mIdx >= 0 && !hasNegationNear(text, mIdx)) candidates.push({ gender: "masculine", idx: mIdx });
  if (nIdx >= 0 && !hasNegationNear(text, nIdx)) candidates.push({ gender: "neutral", idx: nIdx });

  if (candidates.length === 0) return null;

  // Si hay más de uno (caso raro tipo "soy hombre y mujer"), no decidimos
  if (candidates.length > 1) return null;

  return candidates[0].gender;
}

/**
 * Helper: detecta + persiste si el usuario aún no tiene preferencia.
 * No sobrescribe una preferencia ya elegida en /settings.
 *
 * Devuelve true si autoseteó algo, false si no hizo nada (sin detección,
 * preferencia ya seteada, o error).
 */
export async function autoDetectAndSaveGender(params: {
  userId: string;
  message: string;
}): Promise<DetectedGender | null> {
  const detected = detectGenderInMessage(params.message);
  if (!detected) return null;

  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    if (!prisma?.userPreferences) return null;

    const existing = await prisma.userPreferences.findUnique({
      where: { userId: params.userId },
      select: { genderForm: true },
    });

    // Si ya hay preferencia explícita (incluyendo "neutral"), no sobrescribir
    if (existing?.genderForm) return null;

    await prisma.userPreferences.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, genderForm: detected },
      update: { genderForm: detected },
    });

    return detected;
  } catch {
    return null;
  }
}
