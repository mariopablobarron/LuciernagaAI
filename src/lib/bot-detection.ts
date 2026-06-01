/**
 * Bot detection — heurística conservadora basada en User-Agent.
 *
 * Origen: auditoría 2026-06-01 reveló que el 44% de los "usuarios anónimos"
 * de los últimos 30 días son sesiones <60s con 0 mensajes — casi certero que
 * son crawlers (Googlebot, Bingbot, scanners SEO, monitores externos, etc.).
 *
 * Política: NO bloquear el bot ni cambiar su flujo — la home pública debe
 * seguir siendo accesible para SEO. Solo evitamos persistir un User row
 * en BD cuando la identidad se genera para un User-Agent claramente de bot.
 * La cookie de sesión sigue emitiéndose (el bot la ignora). Si el mismo
 * UA luego escribe un mensaje (improbable), el flujo de auth crea el User
 * en ese momento — anonymous-first sigue intacto.
 *
 * Lista deliberadamente conservadora: solo bots conocidos. Si en duda,
 * tratamos como humano. Falsos negativos (humanos clasificados como bot)
 * solo perderían 1 row en BD que se recrearía al primer mensaje.
 */

const BOT_PATTERNS: RegExp[] = [
  // Buscadores principales
  /\bGooglebot\b/i,
  /\bGoogle-InspectionTool\b/i,
  /\bAdsBot-Google\b/i,
  /\bMediapartners-Google\b/i,
  /\bBingbot\b/i,
  /\bDuckDuckBot\b/i,
  /\bBaiduspider\b/i,
  /\bYandexBot\b/i,
  /\bSlurp\b/i, // Yahoo
  /\bApplebot\b/i,
  /\bPetalBot\b/i, // Huawei
  /\bMojeekBot\b/i,
  /\bSeznamBot\b/i,
  // Social previews
  /\bfacebookexternalhit\b/i,
  /\bfacebot\b/i,
  /\bTwitterbot\b/i,
  /\bLinkedInBot\b/i,
  /\bSlackbot\b/i,
  /\bTelegramBot\b/i,
  /\bDiscordbot\b/i,
  /\bWhatsApp\b/i,
  // AI crawlers
  /\bGPTBot\b/i,
  /\bClaudeBot\b/i,
  /\bClaude-Web\b/i,
  /\banthropic-ai\b/i,
  /\bPerplexityBot\b/i,
  /\bCCBot\b/i, // CommonCrawl
  /\bChatGPT-User\b/i,
  /\bcohere-ai\b/i,
  // SEO / monitoring
  /\bAhrefsBot\b/i,
  /\bSemrushBot\b/i,
  /\bMJ12bot\b/i,
  /\bDotBot\b/i,
  /\bBLEXBot\b/i,
  /\bSEOkicks\b/i,
  /\bUptimeRobot\b/i,
  /\bPingdom\b/i,
  /\bStatusCake\b/i,
  /\bBetterUptime\b/i,
  /\bStartideaWatchdog\b/i, // nuestro propio watchdog
  /\bDataDog\b/i,
  /\bNewRelic\b/i,
  // Generic crawler hints
  /\bbot\/[0-9]/i, // mybot/1.0
  /\bcrawler\b/i,
  /\bspider\b/i,
  /\bscraper\b/i,
  /\bScrapy\b/i,
  // HTTP libraries (cuando no spoofean)
  /\bpython-requests\b/i,
  /\bnode-fetch\b/i,
  /\baxios\/[0-9]/i,
  /\bGo-http-client\b/i,
  /\bcurl\/[0-9]/i,
  /\bWget\b/i,
  /\blibwww-perl\b/i,
  /\bokhttp\b/i,
  /\bApache-HttpClient\b/i,
  // Headless browsers (Lighthouse, Puppeteer, etc.)
  /\bHeadlessChrome\b/i,
  /\bPhantomJS\b/i,
  /\bSelenium\b/i,
  /\bPuppeteer\b/i,
];

/**
 * True si el User-Agent matchea cualquier patrón conocido de bot.
 * Si el UA es null/empty/muy corto → tratamos como humano (conservador).
 */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (typeof ua !== "string") return false;
  const trimmed = ua.trim();
  if (trimmed.length < 5) return false;
  return BOT_PATTERNS.some((re) => re.test(trimmed));
}
