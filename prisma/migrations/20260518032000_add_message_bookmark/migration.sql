-- MessageBookmark: el usuario marca una respuesta del mentor para volver
-- a ella más tarde. En estado emocional difícil a veces algo te llega
-- pero no puedes procesarlo entonces — esto permite marcarlo y volver
-- luego desde el modal "Guardados" en la barra del chat.
--
-- Unique (userId, messageId): si el usuario marca dos veces, segundo
-- click se interpreta como "quitar bookmark".

CREATE TABLE "MessageBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageBookmark_userId_messageId_key" ON "MessageBookmark"("userId", "messageId");
CREATE INDEX "MessageBookmark_userId_createdAt_idx" ON "MessageBookmark"("userId", "createdAt");

ALTER TABLE "MessageBookmark" ADD CONSTRAINT "MessageBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageBookmark" ADD CONSTRAINT "MessageBookmark_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
