import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// /api/og?title=...&subtitle=...&kind=action_completed|insight|streak
//
// Endpoint dinámico para tarjetas Open Graph compartibles. Usa Next.js
// ImageResponse (edge runtime, JSX→PNG). Sin SDK, sin coste extra.
//
// Ejemplos de uso (lado cliente):
//   /api/og?title=Acabé mi primera microacción&kind=action_completed
//   /api/og?title=7 días seguidos volviendo a mí mismo&kind=streak
//
// Cualquier param se sanea: máx 140 chars, fallback si falta.

export const runtime = "edge";

const MAX_TITLE_LEN = 140;
const MAX_SUBTITLE_LEN = 200;

function clamp(value: string | null, max: number): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

type Kind = "action_completed" | "insight" | "streak" | "default";
function parseKind(raw: string | null): Kind {
  if (raw === "action_completed" || raw === "insight" || raw === "streak") return raw;
  return "default";
}

const KIND_BADGE: Record<Kind, { label: string; color: string }> = {
  action_completed: { label: "Acción completada", color: "#34d399" },
  insight: { label: "Momento de claridad", color: "#a78bfa" },
  streak: { label: "Racha activa", color: "#fb923c" },
  default: { label: "Tres Mil Millones de Latidos", color: "#c084fc" },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title =
    clamp(searchParams.get("title"), MAX_TITLE_LEN) ||
    "Hoy he dado un paso real";
  const subtitle =
    clamp(searchParams.get("subtitle"), MAX_SUBTITLE_LEN) ||
    "Tres Mil Millones de Latidos · mentoría con IA en español";
  const kind = parseKind(searchParams.get("kind"));
  const badge = KIND_BADGE[kind];

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
          padding: "80px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse 900px 500px at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 22px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${badge.color}55`,
            marginBottom: "40px",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: badge.color,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {badge.label}
          </span>
        </div>

        <div
          style={{
            fontSize: "60px",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            marginBottom: "32px",
            maxWidth: "980px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "22px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "780px",
            lineHeight: 1.5,
            marginBottom: "60px",
          }}
        >
          {subtitle}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            position: "absolute",
            bottom: "60px",
          }}
        >
          <span style={{ fontSize: "28px" }}>💓</span>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#a78bfa",
              letterSpacing: "-0.5px",
            }}
          >
            tresmilmillonesdelatidos.es
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Cache agresivo en edge: la URL contiene los params, así que el
        // mismo título genera el mismo PNG. 1h CDN + revalidate.
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
