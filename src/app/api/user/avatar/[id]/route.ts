import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { validateAvatarDataUri } from "@/lib/avatar-image";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { avatarData: true },
  });

  if (!user?.avatarData) {
    return new NextResponse(null, { status: 404 });
  }

  // Revalidate at the serving boundary so active or mislabeled legacy rows
  // cannot bypass the upload checks added later.
  const avatar = validateAvatarDataUri(user.avatarData);
  if (!avatar.ok) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(avatar.buffer), {
    headers: {
      "Content-Type": avatar.contentType,
      "Content-Disposition": `inline; filename="avatar.${avatar.extension}"`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
