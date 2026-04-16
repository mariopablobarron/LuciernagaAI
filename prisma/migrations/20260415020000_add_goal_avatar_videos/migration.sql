-- Goal-based avatar videos (HeyGen) — three milestones per goal.
-- This migration is idempotent against any prior partial attempt at the
-- weekly-based design, so it is safe to run whether or not the previous
-- migrations were applied.

-- ── Drop leftovers from the previous weekly design if present ─────────────

DROP TABLE IF EXISTS "WeeklyAvatarVideo";
DROP TABLE IF EXISTS "AvatarVideoConfig";

ALTER TABLE "UserPreferences"
    DROP COLUMN IF EXISTS "avatarVideosEnabled";

-- ── Per-user opt-out (kept from previous design, renamed for clarity) ─────

ALTER TABLE "UserPreferences"
    ADD COLUMN "avatarVideosEnabled" BOOLEAN NOT NULL DEFAULT true;

-- ── Goal avatar videos ─────────────────────────────────────────────────────

CREATE TABLE "GoalAvatarVideo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "heygenVideoId" TEXT,
    "videoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoalAvatarVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoalAvatarVideo_goalId_phase_key" ON "GoalAvatarVideo"("goalId", "phase");
CREATE INDEX "GoalAvatarVideo_status_idx" ON "GoalAvatarVideo"("status");
CREATE INDEX "GoalAvatarVideo_userId_seenAt_idx" ON "GoalAvatarVideo"("userId", "seenAt");

ALTER TABLE "GoalAvatarVideo"
    ADD CONSTRAINT "GoalAvatarVideo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalAvatarVideo"
    ADD CONSTRAINT "GoalAvatarVideo_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "Goal"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Broadcast avatar videos (admin-initiated) ────────────────────────────

CREATE TABLE "BroadcastAvatarCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "briefing" TEXT,
    "literalScript" TEXT,
    "sharedVideoUrl" TEXT,
    "sharedHeygenId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "BroadcastAvatarCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BroadcastAvatarCampaign_createdAt_idx" ON "BroadcastAvatarCampaign"("createdAt");
CREATE INDEX "BroadcastAvatarCampaign_status_idx" ON "BroadcastAvatarCampaign"("status");

CREATE TABLE "BroadcastAvatarDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "heygenVideoId" TEXT,
    "videoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BroadcastAvatarDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BroadcastAvatarDelivery_campaignId_userId_key" ON "BroadcastAvatarDelivery"("campaignId", "userId");
CREATE INDEX "BroadcastAvatarDelivery_userId_seenAt_idx" ON "BroadcastAvatarDelivery"("userId", "seenAt");
CREATE INDEX "BroadcastAvatarDelivery_status_idx" ON "BroadcastAvatarDelivery"("status");

ALTER TABLE "BroadcastAvatarDelivery"
    ADD CONSTRAINT "BroadcastAvatarDelivery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BroadcastAvatarDelivery"
    ADD CONSTRAINT "BroadcastAvatarDelivery_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "BroadcastAvatarCampaign"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Admin-editable runtime config (singleton) ─────────────────────────────

CREATE TABLE "AvatarVideoConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "maxVideosPerDay" INTEGER NOT NULL DEFAULT 30,
    "midpointMinDays" INTEGER NOT NULL DEFAULT 3,
    "maxBroadcastsPerMonth" INTEGER NOT NULL DEFAULT 4,
    "broadcastUserCooldownDays" INTEGER NOT NULL DEFAULT 7,
    "welcomeCampaignId" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'interpellation',
    "avatarId" TEXT NOT NULL DEFAULT 'e2ff51edb1154b0dbe2c8f0df59818cf',
    "promptTemplateStart" TEXT NOT NULL,
    "promptTemplateMidpoint" TEXT NOT NULL,
    "promptTemplateEnd" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "AvatarVideoConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AvatarVideoConfig" (
    "id",
    "promptTemplateStart",
    "promptTemplateMidpoint",
    "promptTemplateEnd",
    "updatedAt"
) VALUES (
    'singleton',
    E'Eres Luciérnaga, un mentor cálido y lúcido.\n\n{userName} acaba de comprometerse con un objetivo:\n"{goalTitle}"\n\nContexto reciente de sus últimas conversaciones:\n{recentContext}\n\nGenera un guión hablado de máximo 50 palabras (≈20 segundos) para marcar este umbral.\n\nReglas absolutas:\n- NO celebres. NO digas "qué bien", "me alegra", "enhorabuena". El umbral no se celebra, se reconoce.\n- NO des consejos ni pasos a seguir.\n- Reconoce brevemente que ha tomado una decisión real.\n- Ancla el porqué — qué está detrás de este objetivo, según lo que compartió.\n- Termina con UNA pregunta honesta sobre lo que esto cambia desde hoy.\n- Tono: cercano, directo, sin azúcar.\n- Máximo 50 palabras. Solo el guión, sin comillas.',
    E'Eres Luciérnaga, un mentor cálido y lúcido.\n\n{userName} está en un momento difícil con su objetivo activo:\n"{goalTitle}"\n\nSu estado emocional actual: {currentState}\nContexto reciente de sus últimas conversaciones:\n{recentContext}\n\nGenera un guión hablado de máximo 50 palabras (≈20 segundos) para acompañarle en la prueba.\n\nReglas absolutas:\n- NO animes. NO digas "tú puedes", "no te rindas", "sigue adelante". Eso empuja sin escuchar.\n- NO valides rápido ("qué valiente por intentarlo").\n- Reconoce la dificultad con precisión, sin dramatizar.\n- PROHIBIDO dar consejos o pasos siguientes.\n- Termina con UNA pregunta que le obligue a revisar si el objetivo sigue siendo suyo, o lo heredó de quien creía que debía ser.\n- Tono: presente, cercano, sin prisa.\n- Máximo 50 palabras. Solo el guión, sin comillas.',
    E'Eres Luciérnaga, un mentor cálido y lúcido.\n\n{userName} acaba de completar su objetivo:\n"{goalTitle}"\n\nContexto reciente de sus últimas conversaciones:\n{recentContext}\n\nGenera un guión hablado de máximo 50 palabras (≈20 segundos) para marcar el retorno.\n\nReglas absolutas:\n- NO felicites rápido. NO digas "enhorabuena", "lo lograste", "campeón".\n- NO conviertas el cierre en motivacional vacío.\n- Señala con precisión algo concreto que cambió en él durante el proceso.\n- No le empujes al siguiente objetivo. El silencio después del logro también es parte del trabajo.\n- Termina con UNA pregunta sobre quién es ahora que lo tiene.\n- Tono: reposado, honesto, casi grave.\n- Máximo 50 palabras. Solo el guión, sin comillas.',
    CURRENT_TIMESTAMP
);
