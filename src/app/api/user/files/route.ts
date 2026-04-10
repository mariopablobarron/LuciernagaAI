import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const files = await prisma.userFile.findMany({
      where: { userId: identity.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, mimeType: true, size: true, source: true, createdAt: true },
    });

    return NextResponse.json({
      files: files.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        sizeLabel: f.size < 1024 ? `${f.size} B` : `${Math.round(f.size / 1024)} KB`,
      })),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("FILES", error, { route: "/api/user/files", method: "GET" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      name?: string;
      mimeType?: string;
      data?: string; // base64 data URL
      source?: string;
    };

    if (!body.name || !body.mimeType || !body.data) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(body.mimeType)) {
      return NextResponse.json({ error: "TYPE_NOT_ALLOWED", message: "Solo imagenes y PDFs." }, { status: 400 });
    }

    // Estimate size from base64
    const base64Part = body.data.split(",")[1] ?? body.data;
    const size = Math.round(base64Part.length * 0.75);

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "TOO_LARGE", message: "El archivo debe ser menor de 500 KB." }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const file = await prisma.userFile.create({
      data: {
        userId: identity.userId,
        name: body.name.slice(0, 200),
        mimeType: body.mimeType,
        size,
        data: body.data,
        source: body.source ?? "upload",
      },
      select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json({ success: true, file });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("FILES", error, { route: "/api/user/files", method: "POST" });
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });

    const prisma = getPrismaClient();
    await prisma.userFile.deleteMany({
      where: { id, userId: identity.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("FILES", error, { route: "/api/user/files", method: "DELETE" });
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
