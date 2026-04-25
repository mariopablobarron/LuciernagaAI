import { parseUserAgent, maskIp, formatDevice } from "./request-info";

describe("parseUserAgent", () => {
  it("detecta iPhone Safari", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
    const r = parseUserAgent(ua);
    expect(r.os).toBe("iOS");
    expect(r.osVersion).toBe("17.2");
    expect(r.browser).toBe("Safari");
    expect(r.browserVersion).toBe("17.2");
    expect(r.device).toBe("mobile");
  });

  it("detecta Android Chrome", () => {
    const ua = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    const r = parseUserAgent(ua);
    expect(r.os).toBe("Android");
    expect(r.osVersion).toBe("13");
    expect(r.browser).toBe("Chrome");
    expect(r.device).toBe("mobile");
  });

  it("detecta desktop Chrome en macOS", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const r = parseUserAgent(ua);
    expect(r.os).toBe("macOS");
    expect(r.browser).toBe("Chrome");
    expect(r.device).toBe("desktop");
  });

  it("detecta Edge antes que Chrome", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    const r = parseUserAgent(ua);
    expect(r.browser).toBe("Edge");
    expect(r.os).toBe("Windows");
  });

  it("detecta Firefox", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
    const r = parseUserAgent(ua);
    expect(r.browser).toBe("Firefox");
    expect(r.browserVersion).toBe("120.0");
    expect(r.os).toBe("Linux");
  });

  it("detecta iPad como tablet", () => {
    const ua = "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/604.1";
    const r = parseUserAgent(ua);
    expect(r.device).toBe("tablet");
    expect(r.os).toBe("iOS");
  });

  it("identifica bots conocidos", () => {
    expect(parseUserAgent("curl/7.81.0").device).toBe("bot");
    expect(parseUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)").device).toBe("bot");
    expect(parseUserAgent("Mozilla/5.0 ... Playwright").device).toBe("bot");
  });

  it("UA vacío o null → bot", () => {
    expect(parseUserAgent(null).device).toBe("bot");
    expect(parseUserAgent("").device).toBe("bot");
  });
});

describe("maskIp", () => {
  it("enmascara último octeto IPv4", () => {
    expect(maskIp("81.45.123.45")).toBe("81.45.123.x");
  });

  it("enmascara IPv6 dejando los dos primeros grupos", () => {
    expect(maskIp("2001:db8:85a3::8a2e:370:7334")).toBe("2001:db8:…");
  });

  it("retorna — para unknown o vacío", () => {
    expect(maskIp("unknown")).toBe("—");
    expect(maskIp("")).toBe("—");
  });
});

describe("formatDevice", () => {
  it("formatea con emoji + os + browser", () => {
    const ua = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Version/17.2 Mobile/15E148 Safari/604.1");
    const out = formatDevice(ua);
    expect(out).toContain("📱");
    expect(out).toContain("iOS 17.2");
    expect(out).toContain("Safari");
  });
});
