import type { NextRequest } from "next/server";

export type ParsedUserAgent = {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  device: "mobile" | "tablet" | "desktop" | "bot";
  raw: string;
};

export type RequestContext = {
  ip: string;
  ua: ParsedUserAgent;
  language: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
};

const BOT_PATTERN =
  /(bot|crawl|spider|slurp|bingpreview|uptime|pingdom|monitor|curl|wget|go-http|python-requests|headlesschrome|puppeteer|playwright|lighthouse|semrush|ahrefs|mj12|dotbot|duckduck|yandex|baidu|sogou|facebookexternalhit|whatsapp|telegrambot|gptbot|claudebot|anthropic-ai|perplexitybot|ccbot|bytespider)/i;

function matchVersion(ua: string, name: string): string | undefined {
  const re = new RegExp(`${name}[/\\s]([0-9]+(?:\\.[0-9]+)?)`, "i");
  const m = ua.match(re);
  return m?.[1];
}

export function parseUserAgent(ua: string | null): ParsedUserAgent {
  const raw = ua ?? "";
  if (!raw) {
    return { browser: "desconocido", os: "desconocido", device: "bot", raw };
  }

  if (BOT_PATTERN.test(raw)) {
    return { browser: "bot", os: "bot", device: "bot", raw };
  }

  // OS
  let os = "otro";
  let osVersion: string | undefined;
  if (/iPhone|iPad|iPod/.test(raw)) {
    os = "iOS";
    osVersion = raw.match(/OS (\d+[._]\d+)/)?.[1]?.replace("_", ".");
  } else if (/Android/.test(raw)) {
    os = "Android";
    osVersion = raw.match(/Android (\d+(?:\.\d+)?)/)?.[1];
  } else if (/Windows NT/.test(raw)) {
    os = "Windows";
    const v = raw.match(/Windows NT (\d+\.\d+)/)?.[1];
    osVersion = v === "10.0" ? "10/11" : v;
  } else if (/Mac OS X/.test(raw)) {
    os = "macOS";
    osVersion = raw.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace("_", ".");
  } else if (/CrOS/.test(raw)) {
    os = "ChromeOS";
  } else if (/Linux/.test(raw)) {
    os = "Linux";
  }

  // Browser (orden importa: Edge antes que Chrome, Chrome antes que Safari, etc.)
  let browser = "otro";
  let browserVersion: string | undefined;
  if (/Edg\//.test(raw)) {
    browser = "Edge";
    browserVersion = matchVersion(raw, "Edg");
  } else if (/OPR\//.test(raw)) {
    browser = "Opera";
    browserVersion = matchVersion(raw, "OPR");
  } else if (/SamsungBrowser/.test(raw)) {
    browser = "Samsung";
    browserVersion = matchVersion(raw, "SamsungBrowser");
  } else if (/Firefox\//.test(raw)) {
    browser = "Firefox";
    browserVersion = matchVersion(raw, "Firefox");
  } else if (/CriOS/.test(raw)) {
    browser = "Chrome iOS";
    browserVersion = matchVersion(raw, "CriOS");
  } else if (/FxiOS/.test(raw)) {
    browser = "Firefox iOS";
    browserVersion = matchVersion(raw, "FxiOS");
  } else if (/Chrome\//.test(raw)) {
    browser = "Chrome";
    browserVersion = matchVersion(raw, "Chrome");
  } else if (/Safari\//.test(raw) && /Version\//.test(raw)) {
    browser = "Safari";
    browserVersion = matchVersion(raw, "Version");
  }

  // Device
  let device: ParsedUserAgent["device"] = "desktop";
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(raw)) device = "tablet";
  else if (/Mobile|iPhone|iPod|Android.*Mobile/i.test(raw)) device = "mobile";

  return { browser, browserVersion, os, osVersion, device, raw };
}

export function pickIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export function pickLanguage(req: NextRequest): string | null {
  const al = req.headers.get("accept-language");
  if (!al) return null;
  return al.split(",")[0]?.split(";")[0]?.trim() || null;
}

export function pickReferer(req: NextRequest): string | null {
  const r = req.headers.get("referer") ?? req.headers.get("referrer");
  if (!r) return null;
  try {
    const u = new URL(r);
    return u.host + u.pathname;
  } catch {
    return r.slice(0, 80);
  }
}

export function pickGeo(req: NextRequest): { country: string | null; city: string | null } {
  // Cloudflare / Vercel / Coolify-with-Cloudflare-tunnel headers
  const country =
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("x-country") ??
    null;
  const city =
    req.headers.get("cf-ipcity") ??
    req.headers.get("x-vercel-ip-city") ??
    null;
  return {
    country: country && country !== "XX" ? country : null,
    city: city ? decodeURIComponent(city) : null,
  };
}

export function getRequestContext(req: NextRequest): RequestContext {
  return {
    ip: pickIp(req),
    ua: parseUserAgent(req.headers.get("user-agent")),
    language: pickLanguage(req),
    referer: pickReferer(req),
    ...pickGeo(req),
  };
}

export function maskIp(ip: string): string {
  if (!ip || ip === "unknown") return "—";
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.slice(0, 2).join(":") + ":…";
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  return ip;
}

export function formatDevice(ua: ParsedUserAgent): string {
  const b = ua.browserVersion ? `${ua.browser} ${ua.browserVersion}` : ua.browser;
  const o = ua.osVersion ? `${ua.os} ${ua.osVersion}` : ua.os;
  const d = ua.device === "mobile" ? "📱" : ua.device === "tablet" ? "📲" : ua.device === "desktop" ? "💻" : "🤖";
  return `${d} ${o} · ${b}`;
}
