import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const prisma = getPrismaClient();
  const asset = await prisma.mediaAsset.findUnique({ where: { key } });
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  const base64 = asset.data.includes(",") ? asset.data.split(",")[1] : asset.data;
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Last-Modified": asset.updatedAt.toUTCString(),
    },
  });
}

export async function HEAD(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const prisma = getPrismaClient();
  const asset = await prisma.mediaAsset.findUnique({
    where: { key },
    select: { mimeType: true, size: true, updatedAt: true },
  });
  if (!asset) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Last-Modified": asset.updatedAt.toUTCString(),
    },
  });
}
