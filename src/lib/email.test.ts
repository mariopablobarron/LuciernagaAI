// Smoke tests de email builders (7d-nudge, password_reset, verification).
// build24hNudgeEmail no se testea aquí porque ya está en producción y no
// queremos cambiar comportamiento existente sin tests previos.

import { build7dNudgeEmail, buildPasswordResetEmail, buildVerificationEmail } from "./email";

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

describe("buildPasswordResetEmail", () => {
  const APP_URL = "https://tresmilmillonesdelatidos.es";

  it("usa el subject 'Recupera tu acceso'", () => {
    const email = buildPasswordResetEmail({
      to: "user@example.com",
      resetUrl: `${APP_URL}/reset-password?token=abc`,
      name: "Mario",
    });
    expect(email.subject).toBe("Recupera tu acceso");
  });

  it("incluye el resetUrl como CTA", () => {
    const url = `${APP_URL}/reset-password?token=xyz123`;
    const email = buildPasswordResetEmail({ to: "u@x.com", resetUrl: url, name: null });
    expect(email.html).toContain(url);
    expect(email.text).toContain(url);
  });

  it("personaliza el saludo con el nombre", () => {
    const email = buildPasswordResetEmail({
      to: "u@x.com",
      resetUrl: `${APP_URL}/r?t=1`,
      name: "Lucía",
    });
    expect(email.text).toContain("Hola Lucía");
    expect(email.html).toContain("Hola Lucía");
  });

  it("usa saludo genérico si no hay nombre", () => {
    const email = buildPasswordResetEmail({
      to: "u@x.com",
      resetUrl: `${APP_URL}/r?t=1`,
      name: null,
    });
    expect(email.text).toContain("Hola,");
    expect(email.html).toContain("Hola,");
    expect(email.text).not.toMatch(/Hola \w/);
  });

  it("menciona la caducidad de 1 hora", () => {
    const email = buildPasswordResetEmail({
      to: "u@x.com",
      resetUrl: `${APP_URL}/r?t=1`,
      name: null,
    });
    expect(email.text).toMatch(/válido 1 hora/i);
    expect(email.html).toMatch(/caduca en 1 hora/i);
  });

  it("incluye footer estándar (acompaña — no sustituye)", () => {
    const email = buildPasswordResetEmail({
      to: "u@x.com",
      resetUrl: `${APP_URL}/r?t=1`,
      name: null,
    });
    expect(email.html).toContain("acompaña");
    expect(email.html).toContain("no sustituye");
  });
});

describe("buildVerificationEmail", () => {
  const APP_URL = "https://tresmilmillonesdelatidos.es";

  it("usa subject estándar con marca", () => {
    const email = buildVerificationEmail({
      to: "u@x.com",
      verifyUrl: `${APP_URL}/verify?t=1`,
    });
    expect(email.subject).toBe("Verifica tu email — Tres Mil Millones de Latidos");
  });

  it("incluye el verifyUrl en CTA", () => {
    const url = `${APP_URL}/api/auth/verify-email?token=tok123`;
    const email = buildVerificationEmail({ to: "u@x.com", verifyUrl: url });
    expect(email.html).toContain(url);
    expect(email.text).toContain(url);
  });

  it("escapa el nombre para evitar HTML injection", () => {
    const email = buildVerificationEmail({
      to: "u@x.com",
      verifyUrl: `${APP_URL}/v?t=1`,
      name: "<script>alert('xss')</script>",
    });
    // El html no debe contener el tag script ejecutable
    expect(email.html).not.toContain("<script>alert");
    // Sí debe contener la versión escapada
    expect(email.html).toContain("&lt;script&gt;");
  });
});
