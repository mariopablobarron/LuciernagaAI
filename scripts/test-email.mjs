#!/usr/bin/env node
// Quick smoke test: sends a test email via Resend to verify configuration.
// Usage: npm run test:email
//        RESEND_API_KEY=re_xxx npm run test:email

import "dotenv/config";

const RESEND_URL = "https://api.resend.com/emails";
const TEST_TO = process.env.TEST_EMAIL_TO || "test@tresmilmillonesdelatidos.es";

const apiKey = process.env.RESEND_API_KEY?.trim();
const from =
  process.env.EMAIL_FROM?.trim() ??
  "TresMilMillonesdeLatidos <info@tresmilmillonesdelatidos.es>";

if (!apiKey) {
  console.error("❌ RESEND_API_KEY no configurada.");
  console.error("");
  console.error("Añade a .env.local:");
  console.error("  RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  console.error("");
  console.error("En Coolify → tu servicio → Variables de entorno:");
  console.error("  RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  process.exit(1);
}

console.log(`📧 Enviando email de prueba...`);
console.log(`   From: ${from}`);
console.log(`   To:   ${TEST_TO}`);
console.log("");

try {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [TEST_TO],
      subject: "Test — Tres Mil Millones de Latidos",
      text: "Si ves este email, el sistema de correo funciona correctamente.",
      html: `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:system-ui,sans-serif;color:#d4d4d8">
  <div style="max-width:500px;margin:0 auto;background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden">
    <div style="background:linear-gradient(135deg,#7c3aed,#d946ef);padding:24px 32px">
      <span style="color:#fff;font-size:18px;font-weight:700">Tres Mil Millones de Latidos</span>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;color:#fff;font-size:16px">El sistema de email funciona correctamente.</p>
      <p style="margin:0;color:#71717a;font-size:13px">Este es un email de prueba enviado desde el script test:email.</p>
    </div>
  </div>
</body>
</html>`,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`✅ Email enviado correctamente. ID: ${data.id}`);
  } else {
    const body = await res.text();
    console.error(`❌ Resend API error ${res.status}: ${body}`);
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Error de red:", err.message);
  process.exit(1);
}
