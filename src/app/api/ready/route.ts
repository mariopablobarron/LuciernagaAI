import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      database: "connected",
    });
  } catch {
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 500 }
    );
  }
}
