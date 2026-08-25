import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { invalidateGlossaryCache } from "@/services/glossary";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split("\n").map((v) => v.trim()).filter(Boolean);
  return [];
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdminPermission(req, "glossary");
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = await req.json();
    const prisma = getPrismaClient();
    const existing = await prisma.glossaryTopic.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Tema no encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
    if (typeof body.enabled === "boolean") data.enabled = body.enabled;
    if (body.triggers !== undefined) data.triggers = toStringArray(body.triggers);
    if (typeof body.mentorGuidance === "string") data.mentorGuidance = body.mentorGuidance.trim();
    if (typeof body.exerciseTitle === "string") data.exerciseTitle = body.exerciseTitle.trim();
    if (typeof body.exerciseGoal === "string") data.exerciseGoal = body.exerciseGoal.trim();
    if (body.exerciseSteps !== undefined) data.exerciseSteps = toStringArray(body.exerciseSteps);

    const topic = await prisma.glossaryTopic.update({ where: { id }, data });
    invalidateGlossaryCache();
    return NextResponse.json({ topic });
  } catch (error) {
    logError("GLOSSARY", error, { action: "update" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdminPermission(req, "glossary");
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    const existing = await prisma.glossaryTopic.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Tema no encontrado" }, { status: 404 });
    await prisma.glossaryTopic.delete({ where: { id } });
    invalidateGlossaryCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("GLOSSARY", error, { action: "delete" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
