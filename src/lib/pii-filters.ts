// Filtro de datos personales en texto libre de comunidad.
// La política es "hard": si detectamos PII, rechazamos el post con un mensaje
// pedagógico. No enmascaramos para no normalizar el comportamiento.
//
// Cubrimos: emails, teléfonos, URLs, handles de redes, plataformas de
// mensajería, DNI/NIE españoles e IBAN. El objetivo es capturar el 90 %
// de los casos reales con falsos positivos bajos.

export type PiiKind =
  | "email"
  | "phone"
  | "url"
  | "handle"
  | "social_platform"
  | "messaging_platform"
  | "dni_nie"
  | "iban";

export type PiiMatch = { kind: PiiKind; value: string };

// Plataformas concretas que a menudo aparecen como "hablemos por X"
const SOCIAL_PLATFORMS = /\b(instagram|facebook|tiktok|twitter|linkedin|snapchat|tinder|bumble)\b/i;
const MESSAGING_PLATFORMS = /\b(whatsapp|telegram|signal|discord|messenger)\b/i;

// Email — prioritario (se aplica antes que el handle @xxx)
const EMAIL = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

// URLs explícitas y dominios comunes
const URL_EXPLICIT = /\bhttps?:\/\/\S+/gi;
const URL_BARE = /\b(?:www\.)?(?:[a-z0-9\-]{2,}\.)+(?:com|es|net|org|io|co|app|me|tv|xyz|link|info|dev|blog|shop|store|pro)(?:\/\S*)?\b/gi;

// Handle @xxx (redes). 3+ caracteres tras el @.
// Lo aplicamos DESPUÉS de quitar emails para no falsar positivos.
const HANDLE = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_.]{3,30})\b/g;

// Teléfonos — una secuencia con ≥9 dígitos separados por espacios/guiones/
// puntos/paréntesis, con prefijo + opcional. Cubre: +34 600 11 22 33,
// +34-666-778-899, 666 77 88 99, 666778899, (123) 456-7890, etc.
const PHONE_INTL = /(?:\+?\d[\s\-.()]*){9,}/g;

// DNI español: 8 dígitos + letra | NIE: X/Y/Z + 7 dígitos + letra
const DNI_NIE = /\b(?:[XYZ]\d{7}|\d{8})[A-HJ-NP-TV-Z]\b/i;

// IBAN — 2 letras país + 2 dígitos control + grupos
const IBAN = /\b[A-Z]{2}\d{2}(?:[\s]?\d{4}){3,7}\b/;

// ── Utilidades ───────────────────────────────────────────────────────────────

function countDigits(s: string): number {
  return (s.match(/\d/g) || []).length;
}

export function detectPII(input: string | null | undefined): PiiMatch[] {
  if (!input) return [];
  const text = input.trim();
  if (!text) return [];

  const matches: PiiMatch[] = [];

  // 1) Email primero
  let working = text;
  const emails = text.match(EMAIL);
  if (emails) {
    for (const e of emails) matches.push({ kind: "email", value: e });
    working = working.replace(EMAIL, " ");
  }

  // 2) URLs explícitas y dominios
  const urls = new Set<string>();
  for (const m of working.matchAll(URL_EXPLICIT)) urls.add(m[0]);
  for (const m of working.matchAll(URL_BARE)) urls.add(m[0]);
  for (const u of urls) matches.push({ kind: "url", value: u });
  if (urls.size > 0) {
    for (const u of urls) working = working.split(u).join(" ");
  }

  // 3) Handles @xxxx (ya sin emails)
  for (const m of working.matchAll(HANDLE)) {
    matches.push({ kind: "handle", value: `@${m[1]}` });
  }

  // 4) Teléfonos — sólo si el match tiene ≥9 dígitos reales
  const phoneCandidates = working.match(PHONE_INTL) || [];
  for (const candidate of phoneCandidates) {
    if (countDigits(candidate) >= 9) {
      matches.push({ kind: "phone", value: candidate.trim() });
    }
  }

  // 5) Plataformas
  if (SOCIAL_PLATFORMS.test(text)) {
    matches.push({ kind: "social_platform", value: text.match(SOCIAL_PLATFORMS)![0] });
  }
  if (MESSAGING_PLATFORMS.test(text)) {
    matches.push({ kind: "messaging_platform", value: text.match(MESSAGING_PLATFORMS)![0] });
  }

  // 6) DNI/NIE e IBAN
  const dni = text.match(DNI_NIE);
  if (dni) matches.push({ kind: "dni_nie", value: dni[0] });
  const iban = text.match(IBAN);
  if (iban) matches.push({ kind: "iban", value: iban[0] });

  return matches;
}

export function hasPII(input: string | null | undefined): boolean {
  return detectPII(input).length > 0;
}

export type PiiAssertError = {
  ok: false;
  code: "PERSONAL_DATA";
  kinds: PiiKind[];
  message: string;
};

const USER_MESSAGE =
  "Aquí no se comparten datos de contacto ni enlaces externos. Es una comunidad pensada para cuidarnos — si quieres hablar con alguien, el equipo está en el chat del mentor.";

export function assertNoPII(
  ...texts: Array<string | null | undefined>
): PiiAssertError | null {
  const kinds = new Set<PiiKind>();
  for (const t of texts) {
    for (const m of detectPII(t)) kinds.add(m.kind);
  }
  if (kinds.size === 0) return null;
  return {
    ok: false,
    code: "PERSONAL_DATA",
    kinds: Array.from(kinds),
    message: USER_MESSAGE,
  };
}

// Mensaje también exportado para usar en UI cliente sin duplicar copy.
export const PII_USER_MESSAGE = USER_MESSAGE;
