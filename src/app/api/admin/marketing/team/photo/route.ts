import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:site_content";
const ALLOWED_KEYS = new Set(["team-founder", "team-advisor"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2_000_000; // 2 MB

export const POST = withRateLimit(async function POST(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, PERMISSION);
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const form = await req.formData();
    const key = String(form.get("key") ?? "");
    const file = form.get("file");

    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: "INVALID_KEY" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "INVALID_MIME", allowed: [...ALLOWED_MIME] },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "FILE_TOO_LARGE", maxBytes: MAX_BYTES },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const data = bytes.toString("base64");

    const prisma = getPrismaClient();
    await prisma.mediaAsset.upsert({
      where: { key },
      create: {
        key,
        mimeType: file.type,
        size: bytes.length,
        data,
        updatedBy: adminAuth.adminId ?? null,
      },
      update: {
        mimeType: file.type,
        size: bytes.length,
        data,
        updatedBy: adminAuth.adminId ?? null,
      },
    });

    return NextResponse.json({ ok: true, key, size: bytes.length });
  } catch (error: unknown) {
    logError("ADMIN_TEAM_PHOTO", error, { route: "/api/admin/marketing/team/photo" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}, { limit: 20 });

export const DELETE = withRateLimit(async function DELETE(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, PERMISSION);
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") ?? "";
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: "INVALID_KEY" }, { status: 400 });
    }
    const prisma = getPrismaClient();
    await prisma.mediaAsset.deleteMany({ where: { key } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("ADMIN_TEAM_PHOTO_DELETE", error, {
      route: "/api/admin/marketing/team/photo",
    });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}, { limit: 20 });
