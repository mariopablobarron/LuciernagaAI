import { isAskCommunityCandidate, resolveAskCommunityCta } from "./ask-community-cta";
import { resetCtaCooldownForTests } from "./community-cta-map";

describe("isAskCommunityCandidate", () => {
  it("acepta mensajes que terminan en pregunta", () => {
    expect(
      isAskCommunityCandidate("Llevo dos semanas sin saber cómo retomar este proyecto, ¿por dónde empiezo?"),
    ).toBe(true);
  });

  it("acepta mensajes con 'no sé' o 'cómo'", () => {
    expect(
      isAskCommunityCandidate("Me gustaría cambiar de trabajo pero no sé si es el momento."),
    ).toBe(true);
  });

  it("rechaza mensajes muy cortos", () => {
    expect(isAskCommunityCandidate("¿y ahora?")).toBe(false);
  });

  it("rechaza celebraciones o confirmaciones", () => {
    expect(isAskCommunityCandidate("Lo hice ayer por la tarde, ya está hecho")).toBe(false);
    expect(isAskCommunityCandidate("gracias")).toBe(false);
  });

  it("rechaza mensajes que no son dudas", () => {
    expect(
      isAskCommunityCandidate("Hoy he ido al gimnasio y me siento bien por ello."),
    ).toBe(false);
  });
});

describe("resolveAskCommunityCta", () => {
  const now = new Date("2026-04-23T10:00:00.000Z");

  beforeEach(() => resetCtaCooldownForTests());

  it("devuelve null en crisisMode", () => {
    const result = resolveAskCommunityCta({
      userId: "u1",
      message: "No sé cómo afrontar esta situación, ¿qué haríais vosotros?",
      crisisMode: true,
      now,
    });
    expect(result).toBeNull();
  });

  it("devuelve null si el mensaje no es candidato", () => {
    const result = resolveAskCommunityCta({
      userId: "u1",
      message: "Hoy estuvo bien, nada más",
      crisisMode: false,
      now,
    });
    expect(result).toBeNull();
  });

  it("genera CTA con prefill y kind correcto", () => {
    const msg = "¿Cómo lo hicisteis vosotros para dejar de procrastinar con proyectos personales?";
    const result = resolveAskCommunityCta({
      userId: "u1",
      message: msg,
      crisisMode: false,
      now,
    });
    expect(result).not.toBeNull();
    if (result) {
      expect(result.kind).toBe("ask_community");
      expect(result.suggestedQuestion).toBe(msg);
      expect(result.href).toContain("/community?tab=questions&prefill=");
      expect(result.href).toContain(encodeURIComponent(msg));
    }
  });

  it("respeta cooldown de 3 días", () => {
    const msg = "¿Cómo hacéis vosotros para retomar algo que lleváis tiempo aplazando?";
    const first = resolveAskCommunityCta({ userId: "u1", message: msg, crisisMode: false, now });
    expect(first).not.toBeNull();

    const second = resolveAskCommunityCta({ userId: "u1", message: msg, crisisMode: false, now });
    expect(second).toBeNull();

    // after 4 days → cooldown expired
    const later = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const third = resolveAskCommunityCta({ userId: "u1", message: msg, crisisMode: false, now: later });
    expect(third).not.toBeNull();
  });
});
