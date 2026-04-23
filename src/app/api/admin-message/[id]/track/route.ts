import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GIF transparente 1×1 — respuesta mínima, siempre la misma.
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function buildImageResponse(): NextResponse {
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
    },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id) return buildImageResponse();

  try {
    const prisma = getPrismaClient();
    await prisma.adminMessage.updateMany({
      where: { id, readAt: null },
      data: { readAt: new Date() },
    });
  } catch (error) {
    logError("admin.messages", "track_pixel_failed", { messageId: id, message: (error as Error)?.message });
  }

  return buildImageResponse();
}
