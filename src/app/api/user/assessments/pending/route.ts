import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";

// GET /api/user/assessments/pending — returns the oldest pending assessment for the current user
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const user = { id: identity.userId };
  const prisma = getPrismaClient();

  const assessment = await prisma.assessment.findFirst({
    where: { userId: user.id, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      title: true,
      questions: true,
    },
  });

  if (!assessment) return NextResponse.json({ assessment: null });

  return NextResponse.json({ assessment });
}
