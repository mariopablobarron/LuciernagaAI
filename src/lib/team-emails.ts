// Reglas compartidas para identificar cuentas "internas" (equipo o prueba).
// Se usan en /admin/users (clasificación visible) y en el tracker de Screen
// Time (/api/usage/heartbeat) para excluir estos perfiles de las métricas de
// uso y retención de usuarios reales.

export const TEAM_DOMAINS = ["@startidea.es"];
export const TEAM_EMAILS = new Set<string>([
  "mariopablobarron@gmail.com",
  "angelastartidea@gmail.com",
]);

export const TEST_EMAIL_DOMAINS = [
  "@yopmail.com",
  "@mailinator.com",
  "@example.com",
  "@example.org",
  "@test.com",
];

export const TEST_NAME_OR_EMAIL_PATTERNS =
  /(^|[._-])(test|debug|demo|qa|dummy|fake)([._-]|\d|$)/i;

export function isTeamEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (TEAM_EMAILS.has(normalized)) return true;
  return TEAM_DOMAINS.some((domain) => normalized.endsWith(domain));
}

export function isTestEmail(
  email: string | null | undefined,
  name: string | null | undefined,
): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  const normalizedName = (name ?? "").toLowerCase();
  if (TEST_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain))) return true;
  if (TEST_NAME_OR_EMAIL_PATTERNS.test(normalized)) return true;
  if (TEST_NAME_OR_EMAIL_PATTERNS.test(normalizedName)) return true;
  return false;
}

// "Internal" = cualquier cuenta que no deba contar en métricas de producto.
export function isInternalAccount(
  email: string | null | undefined,
  name: string | null | undefined,
): boolean {
  return isTeamEmail(email) || isTestEmail(email, name);
}
