import { ImageResponse } from "next/og";

// runtime=nodejs en lugar de edge: el contenedor Docker self-hosted en
// VPS Hostinger NO tiene runtime edge configurado — Next.js intenta arrancar
// el handler en edge runtime y devuelve 502. Bug reportado por SEO audit
// 2026-06-23: el opengraph-image responde 502 → cada link compartido en
// WhatsApp/LinkedIn muestra preview rota. Cambio a nodejs runtime hace que
// el handler corra en el Node.js runtime estándar que sí tenemos en el
// container. Trade-off: ~50ms más de cold start, pero la imagen es la
// MISMA y se cachea agresivamente downstream.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            background:
              "radial-gradient(ellipse 800px 400px at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <span style={{ fontSize: "36px" }}>🔥</span>
          <span
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#a78bfa",
              letterSpacing: "-0.5px",
            }}
          >
            Tres Mil Millones de Latidos
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: "800",
            color: "#ffffff",
            textAlign: "center",
            lineHeight: "1.1",
            letterSpacing: "-2px",
            marginBottom: "28px",
            maxWidth: "900px",
          }}
        >
          ¿Qué te está{" "}
          <span style={{ color: "#c084fc" }}>frenando</span>?
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: "24px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: "1.5",
            marginBottom: "48px",
          }}
        >
          Detectamos tu estado y te damos un próximo paso concreto. Gratis.
        </div>

        {/* State badges */}
        <div style={{ display: "flex", gap: "16px" }}>
          {[
            { emoji: "🧱", label: "Bloqueo", color: "#fb923c" },
            { emoji: "⚡", label: "Ansiedad", color: "#facc15" },
            { emoji: "🌫️", label: "Niebla", color: "#60a5fa" },
            { emoji: "✨", label: "Claridad", color: "#a78bfa" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "100px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span style={{ fontSize: "20px" }}>{s.emoji}</span>
              <span style={{ fontSize: "16px", color: s.color, fontWeight: "600" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
