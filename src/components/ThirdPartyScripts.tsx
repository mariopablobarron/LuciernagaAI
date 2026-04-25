"use client";

import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";
import Inspectlet from "@/components/Inspectlet";
import CustomTrackers from "@/components/CustomTrackers";

/**
 * Punto único de entrada para todos los scripts/píxeles de terceros.
 *
 * Trackers principales (env vars, requieren redeploy):
 *   - Google Analytics 4 — NEXT_PUBLIC_GA_MEASUREMENT_ID
 *   - Meta (Facebook) Pixel — NEXT_PUBLIC_META_PIXEL_ID
 *   - Inspectlet (session replay) — NEXT_PUBLIC_INSPECTLET_WID (default 1417203707)
 *
 * Trackers personalizados (DB, gestionados desde /admin/marketing → Trackers):
 *   - Hotjar, Microsoft Clarity, Plausible, PostHog
 *   - Activación instantánea sin redeploy.
 */
export default function ThirdPartyScripts() {
  return (
    <>
      <Analytics />
      <MetaPixel />
      <Inspectlet />
      <CustomTrackers />
    </>
  );
}
