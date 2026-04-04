import { type NextRequest, NextResponse } from "next/server";
import { validateInviteCode } from "@/services/invites";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const invite = await validateInviteCode(code);
  if (!invite) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    inviterName: invite.user.name ?? "alguien de Luciérnaga",
  });
}
