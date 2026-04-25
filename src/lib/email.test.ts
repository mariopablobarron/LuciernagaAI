// Smoke tests del email builder del 7d-nudge.
// build24hNudgeEmail no se testea aquí porque ya está en producción y no
// queremos cambiar comportamiento existente sin tests previos.

import { build7dNudgeEmail } from "./email";

describe("build7dNudgeEmail", () => {
  const APP_URL = "https://tresmilmillonesdelatidos.es";

  it("personaliza el subject con el primer nombre cuando lo hay", () => {
    const email = build7dNudgeEmail({
      name: "Mario Pablo",
      lastUserPhrase: "estoy bloqueado con esto",
      appUrl: APP_URL,
    });
    expect(email.subject).toBe("Mario, lo último que dijiste");
  });

  it("usa subject genérico si name es null", () => {
    const email = build7dNudgeEmail({
      name: null,
      lastUserPhrase: "estoy bloqueado",
      appUrl: APP_URL,
    });
    expect(email.subject).toBe("Lo último que dijiste");
  });

  it("incluye la frase del usuario en text y html", () => {
    const phrase = "no sé por qué me cuesta tanto hablar con mi madre";
    const email = build7dNudgeEmail({
      name: "Ana",
      lastUserPhrase: phrase,
      appUrl: APP_URL,
    });
    expect(email.text).toContain(phrase);
    expect(email.html).toContain(phrase);
  });

  it("trunca frases largas a 140 chars con ellipsis", () => {
    const longPhrase = "a".repeat(200);
    const email = build7dNudgeEmail({
      name: null,
      lastUserPhrase: longPhrase,
      appUrl: APP_URL,
    });
    // text debe tener la versión truncada (137 chars + "...")
    expect(email.text).toContain(`${"a".repeat(137)}...`);
    expect(email.text).not.toContain("a".repeat(141));
  });

  it("escapa HTML peligroso en la frase", () => {
    const malicious = '<script>alert("x")</script>';
    const email = build7dNudgeEmail({
      name: null,
      lastUserPhrase: malicious,
      appUrl: APP_URL,
    });
    // HTML escapado en el blockquote
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    // Pero el text plano sí lleva la frase tal cual (no se renderiza)
    expect(email.text).toContain(malicious);
  });

  it("CTA apunta a /app del appUrl pasado", () => {
    const email = build7dNudgeEmail({
      name: null,
      lastUserPhrase: "x",
      appUrl: "https://example.com",
    });
    expect(email.html).toContain("https://example.com/app");
    expect(email.text).toContain("https://example.com/app");
  });

  it("normaliza espacios múltiples a uno solo en la frase", () => {
    const email = build7dNudgeEmail({
      name: null,
      lastUserPhrase: "hola    mundo\n\n\nadiós",
      appUrl: APP_URL,
    });
    expect(email.text).toContain("hola mundo adiós");
    expect(email.text).not.toContain("hola    mundo");
  });
});
