"use client";

import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";
import Inspectlet from "@/components/Inspectlet";

/**
 * Punto único de entrada para todos los scripts/píxeles de terceros.
 * Para añadir uno nuevo:
 *   1. Crear el componente cliente (gated por cookie_consent).
 *   2. Importarlo aquí y montarlo dentro del fragmento.
 *
 * Cada componente lee su propio flag de consent y/o env var, así que
 * añadir/quitar trackers no toca otros sitios.
 *
 * Trackers actuales:
 *   - Google Analytics 4 — NEXT_PUBLIC_GA_MEASUREMENT_ID
 *   - Meta (Facebook) Pixel — NEXT_PUBLIC_META_PIXEL_ID
 *   - Inspectlet (session replay) — NEXT_PUBLIC_INSPECTLET_WID (default 1417203707)
 */
export default function ThirdPartyScripts() {
  return (
    <>
      <Analytics />
      <MetaPixel />
      <Inspectlet />
    </>
  );
}
