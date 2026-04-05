import { NextResponse } from "next/server";
import { CRISIS_SUPPORT_RESOURCES, PRODUCT_DISCLAIMERS, RESPONSIBLE_USE_NOTES } from "@/lib/legal";

export async function GET() {
  return NextResponse.json({
    success: true,
    product: "Tres Mil Millones de Latidos",
    disclaimers: PRODUCT_DISCLAIMERS,
    responsibleUse: RESPONSIBLE_USE_NOTES,
    crisisResources: CRISIS_SUPPORT_RESOURCES,
  });
}
