import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { invalidateGlossaryCache } from "@/services/glossary";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Normaliza un campo que puede llegar como array o como texto multilínea. */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

const SLUG_RE = /^[a-z0-9-]+$/;

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "glossary");
  if (auth instanceof NextResponse) return auth;
  try {
    const prisma = getPrismaClient();
    const topics = await prisma.glossaryTopic.findMany({ orderBy: { label: "asc" } });
    return NextResponse.json({ topics });
  } catch (error) {
    logError("GLOSSARY", error, { action: "admin_list" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "glossary");
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const mentorGuidance =
      typeof body.mentorGuidance === "string" ? body.mentorGuidance.trim() : "";
    const exerciseTitle =
      typeof body.exerciseTitle === "string" ? body.exerciseTitle.trim() : "";

    if (!slug || !SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "Slug requerido (minúsculas, números y guiones)" },
        { status: 400 },
      );
    }
    if (!label) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    if (!mentorGuidance) {
      return NextResponse.json({ error: "La guía del mentor es requerida" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const existing = await prisma.glossaryTopic.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: `Ya existe un tema con slug «${slug}»` }, { status: 409 });
    }

    const topic = await prisma.glossaryTopic.create({
      data: {
        slug,
        label,
        enabled: body.enabled !== false,
        triggers: toStringArray(body.triggers),
        mentorGuidance,
        exerciseTitle,
        exerciseGoal: typeof body.exerciseGoal === "string" ? body.exerciseGoal.trim() : "",
        exerciseSteps: toStringArray(body.exerciseSteps),
      },
    });
    invalidateGlossaryCache();
    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    logError("GLOSSARY", error, { action: "create" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
