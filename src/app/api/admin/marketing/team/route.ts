import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:site_content";
const LOCALES = ["es", "en"] as const;

const EDITABLE_KEYS = [
  "team.sectionLabel",
  "team.title",
  "team.subtitle",
  "team.aiRole.title",
  "team.aiRole.description",
  "team.humanRole.title",
  "team.humanRole.description",
  "team.founder.name",
  "team.founder.role",
  "team.founder.bio",
  "team.advisor.name",
  "team.advisor.role",
  "team.advisor.bio",
  "team.transparency",
] as const;

type Locale = (typeof LOCALES)[number];

function getNested(obj: unknown, path: string): string {
  const segments = path.split(".");
  let cur: unknown = obj;
  for (const seg of segments) {
    if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return "";
    }
  }
  return typeof cur === "string" ? cur : "";
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, PERMISSION);
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const prisma = getPrismaClient();
    const [overrides, esBase, enBase] = await Promise.all([
      prisma.siteContent.findMany({
        where: { key: { in: [...EDITABLE_KEYS] } },
      }),
      import("../../../../../../messages/es.json").then((m) => m.default),
      import("../../../../../../messages/en.json").then((m) => m.default),
    ]);

    const overrideMap = new Map<string, string>();
    for (const o of overrides) overrideMap.set(`${o.locale}:${o.key}`, o.value);

    const build = (locale: Locale, base: unknown) => {
      const out: Record<string, string> = {};
      for (const k of EDITABLE_KEYS) {
        out[k] = overrideMap.get(`${locale}:${k}`) ?? getNested(base, k);
      }
      return out;
    };

    return NextResponse.json({
      keys: EDITABLE_KEYS,
      locales: LOCALES,
      values: {
        es: build("es", esBase),
        en: build("en", enBase),
      },
    });
  } catch (error: unknown) {
    logError("ADMIN_TEAM_GET", error, { route: "/api/admin/marketing/team" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}, { limit: 60 });

export const PUT = withRateLimit(async function PUT(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, PERMISSION);
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const body = await req.json();
    const values = body?.values;
    if (!values || typeof values !== "object") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const ops: Array<Promise<unknown>> = [];

    for (const locale of LOCALES) {
      const perLocale = values[locale];
      if (!perLocale || typeof perLocale !== "object") continue;
      for (const key of EDITABLE_KEYS) {
        const raw = perLocale[key];
        if (typeof raw !== "string") continue;
        const value = raw.slice(0, 4000);
        ops.push(
          prisma.siteContent.upsert({
            where: { key_locale: { key, locale } },
            create: { key, locale, value, updatedBy: adminAuth.adminId ?? null },
            update: { value, updatedBy: adminAuth.adminId ?? null },
          }),
        );
      }
    }

    await Promise.all(ops);
    return NextResponse.json({ ok: true, updated: ops.length });
  } catch (error: unknown) {
    logError("ADMIN_TEAM_PUT", error, { route: "/api/admin/marketing/team" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}, { limit: 30 });
