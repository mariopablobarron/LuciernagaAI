import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { adminJson } from "@/lib/admin-response";
import { getPrismaClient } from "@/db/prisma";
import {
  EMAIL_TEMPLATES,
  CATEGORY_LABELS,
  type EmailTemplateMeta,
} from "@/lib/email-templates-catalog";
import { PREVIEW_REGISTRY } from "@/lib/email-templates-preview";

export const dynamic = "force-dynamic";

type TemplateRow = EmailTemplateMeta & {
  previewable: boolean;
  stats: {
    total: number;
    delivered: number;
    failed: number;
    bounced: number;
    queued: number;
    other: number;
    lastSentAt: string | null;
    lastError: string | null;
  };
};

export async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "marketing:metrics");
  if (adminAuth instanceof NextResponse) return adminAuth;

  const prisma = getPrismaClient();

  const grouped = await prisma.emailLog.groupBy({
    by: ["template", "status"],
    _count: { _all: true },
  });

  const lastByTemplate = await prisma.emailLog.groupBy({
    by: ["template"],
    _max: { createdAt: true },
  });
  const lastSentMap = new Map(lastByTemplate.map((g) => [g.template, g._max.createdAt]));

  const lastErrorByTemplate = await prisma.emailLog.findMany({
    where: { status: "failed", errorMessage: { not: null } },
    orderBy: { createdAt: "desc" },
    distinct: ["template"],
    select: { template: true, errorMessage: true },
    take: 100,
  });
  const errorMap = new Map(lastErrorByTemplate.map((r) => [r.template, r.errorMessage]));

  const statsByTemplate = new Map<string, TemplateRow["stats"]>();
  for (const g of grouped) {
    const t = g.template;
    if (!statsByTemplate.has(t)) {
      statsByTemplate.set(t, {
        total: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        queued: 0,
        other: 0,
        lastSentAt: null,
        lastError: null,
      });
    }
    const s = statsByTemplate.get(t)!;
    const count = g._count._all;
    s.total += count;
    if (g.status === "delivered" || g.status === "sent") s.delivered += count;
    else if (g.status === "failed") s.failed += count;
    else if (g.status === "bounced") s.bounced += count;
    else if (g.status === "queued") s.queued += count;
    else s.other += count;
  }

  for (const [template, stats] of statsByTemplate) {
    stats.lastSentAt = lastSentMap.get(template)?.toISOString() ?? null;
    stats.lastError = errorMap.get(template) ?? null;
  }

  const previewableIds = new Set(Object.keys(PREVIEW_REGISTRY));

  const knownTemplates: TemplateRow[] = EMAIL_TEMPLATES.map((meta) => ({
    ...meta,
    previewable: previewableIds.has(meta.id),
    stats: statsByTemplate.get(meta.id) ?? {
      total: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      queued: 0,
      other: 0,
      lastSentAt: null,
      lastError: null,
    },
  }));

  const knownIds = new Set(EMAIL_TEMPLATES.map((t) => t.id));
  const unknownTemplates: TemplateRow[] = [];
  for (const [template, stats] of statsByTemplate) {
    if (knownIds.has(template)) continue;
    unknownTemplates.push({
      id: template,
      name: template === "unknown" ? "(sin etiqueta)" : template,
      description: "Plantilla detectada en EmailLog pero no catalogada. Añadirla al catálogo.",
      category: "admin",
      trigger: "Desconocido — revisar código.",
      previewable: false,
      stats,
    });
  }

  return adminJson({
    categories: CATEGORY_LABELS,
    templates: knownTemplates,
    unknownTemplates,
    totals: {
      cataloged: knownTemplates.length,
      uncataloged: unknownTemplates.length,
    },
  });
}
