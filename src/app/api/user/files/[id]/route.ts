import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const prisma = getPrismaClient();

  const file = await prisma.userFile.findUnique({
    where: { id },
    select: { data: true, mimeType: true, name: true },
  });

  if (!file?.data) {
    return new NextResponse(null, { status: 404 });
  }

  const match = /^data:[^;]+;base64,(.+)$/.exec(file.data);
  if (!match) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = Buffer.from(match[1], "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.name}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
