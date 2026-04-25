import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type TrackerStatus = {
  id: "ga4" | "meta_pixel" | "inspectlet";
  name: string;
  description: string;
  configured: boolean;
  identifier: string | null;
  envVar: string;
  consentRequired: true;
  dashboardUrl: string;
};

export async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "marketing:metrics");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null;
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  const inspectlet = process.env.NEXT_PUBLIC_INSPECTLET_WID ?? "1417203707"; // default hardcoded

  const trackers: TrackerStatus[] = [
    {
      id: "ga4",
      name: "Google Analytics 4",
      description: "Eventos, conversiones, audiencias.",
      configured: Boolean(ga),
      identifier: ga,
      envVar: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
      consentRequired: true,
      dashboardUrl: ga
        ? `https://analytics.google.com/analytics/web/#/p${ga.replace(/^G-/, "")}/reports/intelligenthome`
        : "https://analytics.google.com",
    },
    {
      id: "meta_pixel",
      name: "Meta (Facebook) Pixel",
      description: "Conversiones para Facebook/Instagram Ads.",
      configured: Boolean(meta),
      identifier: meta,
      envVar: "NEXT_PUBLIC_META_PIXEL_ID",
      consentRequired: true,
      dashboardUrl: meta
        ? `https://business.facebook.com/events_manager2/list/pixel/${meta}`
        : "https://business.facebook.com/events_manager",
    },
    {
      id: "inspectlet",
      name: "Inspectlet",
      description: "Session replay + heatmaps + rage clicks.",
      configured: Boolean(inspectlet),
      identifier: inspectlet,
      envVar: "NEXT_PUBLIC_INSPECTLET_WID",
      consentRequired: true,
      dashboardUrl: "https://app.inspectlet.com/dashboard",
    },
  ];

  return NextResponse.json({ trackers });
}
