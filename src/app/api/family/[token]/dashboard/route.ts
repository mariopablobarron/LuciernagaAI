import { type NextRequest, NextResponse } from "next/server";
import { resolveFamilyPortal, getFamilyDashboardData } from "@/services/family";

// GET /api/family/[token]/dashboard
// Public — authenticated only by token in URL
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const contact = await resolveFamilyPortal(token);
  if (!contact) {
    return NextResponse.json({ error: "Portal no encontrado o enlace inválido." }, { status: 404 });
  }

  const data = await getFamilyDashboardData(contact);
  return NextResponse.json({ ok: true, data });
}
