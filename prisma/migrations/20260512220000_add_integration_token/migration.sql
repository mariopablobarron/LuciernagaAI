-- Almacena refresh tokens OAuth del admin para publicar en plataformas externas

CREATE TABLE "IntegrationToken" (
  "id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "username" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationToken_platform_key" ON "IntegrationToken"("platform");
