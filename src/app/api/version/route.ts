import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint público que devuelve la versión del build actualmente desplegado.
 * Lo consume el hook `useVersionCheck` del cliente cada N minutos para detectar
 * cuándo se ha desplegado una versión nueva y mostrar el banner "Recargar".
 */
export async function GET() {
  const version = process.env.NEXT_PUBLIC_BUILD_VERSION || "unknown";
  return NextResponse.json(
    { version },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}
