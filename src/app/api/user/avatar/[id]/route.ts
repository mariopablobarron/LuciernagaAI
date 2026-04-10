import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { avatarData: true },
  });

  if (!user?.avatarData) {
    return new NextResponse(null, { status: 404 });
  }

  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(user.avatarData);
  if (!match) {
    return new NextResponse(null, { status: 404 });
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
