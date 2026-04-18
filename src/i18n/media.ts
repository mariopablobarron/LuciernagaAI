import { getPrismaClient } from "@/lib/prisma";

export type MediaResolution = {
  url: string | null;
  exists: boolean;
};

export async function resolveMedia(key: string): Promise<MediaResolution> {
  try {
    const prisma = getPrismaClient();
    const asset = await prisma.mediaAsset.findUnique({
      where: { key },
      select: { updatedAt: true },
    });
    if (!asset) return { url: null, exists: false };
    const v = asset.updatedAt.getTime();
    return { url: `/api/media/${key}?v=${v}`, exists: true };
  } catch {
    return { url: null, exists: false };
  }
}
