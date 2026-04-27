/**
 * Cron: rellena embeddings de mensajes pendientes.
 *
 * Estrategia: agarra el batch más reciente de mensajes sin `embeddedAt`,
 * los embed en una sola llamada a OpenAI, y los guarda. El índice parcial
 * `Message_embeddedAt_pending_idx` hace este SELECT instantáneo aunque la
 * tabla crezca.
 *
 * Frecuencia recomendada: cada 10 min. Coste por tick: 1 llamada API.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import {
  EmbeddingsDisabledError,
  embedBatch,
  isEmbeddingsEnabled,
  prepareForEmbed,
  shouldEmbed,
} from "@/lib/embeddings";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 100; // mensajes por tick — controla coste y latencia

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  if (!isEmbeddingsEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: "OPENAI_API_KEY no configurada",
      embedded: 0,
    });
  }

  const prisma = getPrismaClient();

  try {
    const pending = await prisma.message.findMany({
      where: { embeddedAt: null },
      orderBy: { createdAt: "desc" },
      take: BATCH_SIZE,
      select: { id: true, content: true },
    });

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, embedded: 0, scanned: 0 });
    }

    const embeddable = pending.filter((m) => shouldEmbed(m.content));
    const skipped = pending.length - embeddable.length;

    // Marca los descartados como embedded con array vacío para no reintentar.
    if (skipped > 0) {
      await prisma.message.updateMany({
        where: { id: { in: pending.filter((m) => !shouldEmbed(m.content)).map((m) => m.id) } },
        data: { embeddedAt: new Date() },
      });
    }

    if (embeddable.length === 0) {
      return NextResponse.json({ ok: true, embedded: 0, skipped, scanned: pending.length });
    }

    const inputs = embeddable.map((m) => prepareForEmbed(m.content));
    const vectors = await embedBatch(inputs);

    if (vectors.length !== embeddable.length) {
      throw new Error(
        `Embeddings count mismatch: got ${vectors.length}, expected ${embeddable.length}`,
      );
    }

    // Update uno a uno (Prisma no soporta updateMany con valores distintos por fila).
    const now = new Date();
    await prisma.$transaction(
      embeddable.map((msg, i) =>
        prisma.message.update({
          where: { id: msg.id },
          data: { embedding: vectors[i], embeddedAt: now },
        }),
      ),
    );

    logInfo("CRON", "embed-pending-messages", {
      scanned: pending.length,
      embedded: embeddable.length,
      skipped,
    });

    return NextResponse.json({
      ok: true,
      scanned: pending.length,
      embedded: embeddable.length,
      skipped,
    });
  } catch (error) {
    if (error instanceof EmbeddingsDisabledError) {
      return NextResponse.json({ ok: true, skipped: error.message, embedded: 0 });
    }
    logError("CRON", error, { cron: "embed-pending-messages" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
