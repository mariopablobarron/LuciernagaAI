import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, clearSessionCookie } from "@/lib/auth";
import { executeRightToErasure } from "@/services/gdpr";
import { logError } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);

    // Borramos datos físicamente de DB y proveedores (Stripe)
    await executeRightToErasure(identity.userId);

    // Destruimos la sesión en el navegador
    const res = NextResponse.json({ success: true, message: "Cuenta eliminada" });
    clearSessionCookie(res);
    return res;
  } catch (error: unknown) {
    logError("GDPR", error, { area: "delete_account_api" });
    return NextResponse.json({ success: false, error: "Fallo al borrar cuenta" }, { status: 500 });
  }
}
