"use client";

import Script from "next/script";

/**
 * Umami sin consent — captura 100% del tráfico de forma legal.
 *
 * Justificación legal (GDPR/ePrivacy/LSSI España):
 * Umami está diseñado para NO usar cookies y NO almacenar identificadores
 * persistentes vinculables a una persona. Genera un session_id efímero
 * basado en hash(IP + User-Agent + día) que rota cada 24h y nunca se
 * persiste cross-device. Por eso Umami queda fuera del ámbito que exige
 * consentimiento explícito previo bajo el artículo 22 LSSI (transposición
 * de ePrivacy en España).
 *
 * Referencia: https://umami.is/docs/faq#do-i-need-a-cookie-consent-banner
 *
 * Diseño:
 *   - Se monta SIEMPRE (sin gating de cookie_consent), a diferencia de
 *     GA4/Meta/PostHog/Hotjar/Clarity que sí requieren consent.
 *   - websiteId + apiHost hardcoded porque son client-side de todas formas
 *     (cualquiera puede verlos en el HTML); no son secretos.
 *   - Si en el futuro el banner CookieConsent expone rechazo explícito
 *     "no analytics nunca", añadir aquí check para respetarlo.
 *
 * Bug reportado 2026-06-23: Umami capturaba solo 20-30% del tráfico real
 * porque estaba dentro del flujo gated por cookie_consent=true. Mismo
 * patrón aplicaba a GA/Meta/PostHog, pero esos sí necesitan cookies y
 * por tanto consent. Umami es la excepción legal-segura.
 */

const UMAMI_WEBSITE_ID = "a0af4ed5-6bf5-4e84-951a-5d4bb0642ce1";
const UMAMI_HOST = "https://analytics.hubstartidea.es";

export default function UmamiPublic() {
  return (
    <Script
      id="umami-public"
      strategy="afterInteractive"
      defer
      data-website-id={UMAMI_WEBSITE_ID}
      src={`${UMAMI_HOST}/script.js`}
    />
  );
}
