/**
 * Sistema unificado de layout para emails de Tres Mil Millones de Latidos.
 *
 * Reemplaza progresivamente: emailShell (onboarding), familyLayout, circleLayout
 * y los HTML hardcoded en src/lib/email.ts.
 *
 * Diseño:
 * - Theme dark/light según contexto (producto = dark, contactos externos = light).
 * - Header con logo y latido, opcional minimal cuando el cuerpo ya da contexto.
 * - Tipografía con jerarquía fija: H1 22px, H2 18px, body 15px, footer 11px.
 * - CTA único por vista, gradiente violeta-rosa (dark) o sólido violeta (light).
 * - Footer estandarizado con cláusula legal y link de unsubscribe.
 */

const BRAND_NAME = "Tres Mil Millones de Latidos";
const VIOLET = "#7c3aed";
const PINK = "#ec4899";
const YELLOW = "#f5c518";

export type EmailTheme = "dark" | "light";
export type HeaderStyle = "branded" | "family" | "minimal";
export type FooterStyle = "product" | "private";

export type LayoutConfig = {
  theme?: EmailTheme;
  width?: number;
  header?: HeaderStyle;
  footer?: FooterStyle;
  body: string;
  cta?: { href: string; label: string };
  footerNote?: string;
};

function escapeForLayout(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHeader(theme: EmailTheme, style: HeaderStyle): string {
  if (style === "minimal") return "";
  if (style === "family") {
    return `
        <tr><td style="background:#1a1a1a;padding:20px 32px">
          <span style="color:${YELLOW};font-size:18px;font-weight:700">${BRAND_NAME}</span>
          <span style="color:#888;font-size:12px;margin-left:8px">— red de apoyo</span>
        </td></tr>`;
  }
  // branded
  if (theme === "dark") {
    return `
        <tr><td style="background:linear-gradient(135deg,${VIOLET},${PINK});padding:24px 32px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px">💓 ${BRAND_NAME}</p>
        </td></tr>`;
  }
  // light branded
  return `
        <tr><td style="background:#fff;padding:24px 32px;border-bottom:1px solid #eee">
          <p style="margin:0;font-size:20px;font-weight:700;color:${VIOLET};letter-spacing:-0.3px">💓 ${BRAND_NAME}</p>
        </td></tr>`;
}

function renderCta(cta: { href: string; label: string }, theme: EmailTheme): string {
  const label = escapeForLayout(cta.label);
  if (theme === "dark") {
    return `
            <div style="text-align:center;margin:32px 0 8px">
              <a href="${cta.href}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${VIOLET},${PINK});color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.2px">${label}</a>
            </div>`;
  }
  return `
            <div style="text-align:center;margin:32px 0 8px">
              <a href="${cta.href}" style="display:inline-block;padding:14px 32px;background:${VIOLET};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.2px">${label}</a>
            </div>`;
}

function renderFooter(theme: EmailTheme, style: FooterStyle, footerNote?: string): string {
  const isDark = theme === "dark";
  const borderColor = isDark ? "#27272a" : "#eee";
  const noteColor = isDark ? "#71717a" : "#888";
  const legal = style === "private"
    ? "Este mensaje es confidencial. No lo reenvíes sin permiso del usuario."
    : `${BRAND_NAME} acompaña — no sustituye ayuda profesional. Puedes desactivar estos avisos en tus Ajustes.`;
  const note = footerNote ? `<p style="margin:0 0 8px;font-size:11px;color:${noteColor};line-height:1.5">${escapeForLayout(footerNote)}</p>` : "";
  return `
        <tr><td style="padding:20px 32px;border-top:1px solid ${borderColor}">
          ${note}
          <p style="margin:0;font-size:11px;color:${noteColor};line-height:1.5">${legal}</p>
        </td></tr>`;
}

export function baseLayout(config: LayoutConfig): string {
  const theme: EmailTheme = config.theme ?? "dark";
  const width = config.width ?? 560;
  const header: HeaderStyle = config.header ?? "branded";
  const footer: FooterStyle = config.footer ?? "product";

  const isDark = theme === "dark";
  const bgPage = isDark ? "#0a0a0a" : "#f9f9f7";
  const bgCard = isDark ? "#18181b" : "#fff";
  const borderCard = isDark ? "1px solid #27272a" : "1px solid #eee";
  const textColor = isDark ? "#d4d4d8" : "#111";

  const ctaHtml = config.cta ? renderCta(config.cta, theme) : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bgPage};font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bgPage};padding:40px 0">
    <tr><td align="center">
      <table width="${width}" cellpadding="0" cellspacing="0" style="background:${bgCard};border-radius:12px;overflow:hidden;border:${borderCard}">
        ${renderHeader(theme, header)}
        <tr><td style="padding:32px;color:${textColor};font-size:15px;line-height:1.6">
            ${config.body}
            ${ctaHtml}
          </td></tr>
        ${renderFooter(theme, footer, config.footerNote)}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Botón CTA con estilo unificado. Útil cuando se quiere meter dentro del body
 * en vez de pasarlo por config.cta (e.g. cuando hay varios CTAs o uno secundario).
 */
export function ctaButton(href: string, label: string, theme: EmailTheme = "dark"): string {
  return renderCta({ href, label }, theme).trim();
}

/**
 * Helpers de tipografía ya estandarizados con la jerarquía fija.
 */
export const typo = {
  h1: (text: string, theme: EmailTheme = "dark") =>
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${theme === "dark" ? "#fff" : "#111"};line-height:1.3;letter-spacing:-0.3px">${text}</h1>`,
  h2: (text: string, theme: EmailTheme = "dark") =>
    `<h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:${theme === "dark" ? "#fff" : "#111"};line-height:1.4">${text}</h2>`,
  p: (text: string, theme: EmailTheme = "dark") =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${theme === "dark" ? "#d4d4d8" : "#444"}">${text}</p>`,
  small: (text: string, theme: EmailTheme = "dark") =>
    `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${theme === "dark" ? "#a1a1aa" : "#666"}">${text}</p>`,
};
