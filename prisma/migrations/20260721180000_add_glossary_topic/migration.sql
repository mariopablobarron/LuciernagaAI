-- GlossaryTopic: glosario de temas trabajables editable desde /admin/glosario.
-- Cuando el usuario expresa uno de los `triggers` en el chat, el mentor recibe
-- la guía psicoeducativa (no diagnóstico) y puede ofrecer el ejercicio curado.
-- Versión de producción del prototipo en código: el equipo humano cura el
-- contenido sin redeploy. Barandilla AI Act: material revisable por humanos.

CREATE TABLE "GlossaryTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mentorGuidance" TEXT NOT NULL,
    "exerciseTitle" TEXT NOT NULL,
    "exerciseGoal" TEXT NOT NULL,
    "exerciseSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryTopic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlossaryTopic_slug_key" ON "GlossaryTopic"("slug");

CREATE INDEX "GlossaryTopic_enabled_idx" ON "GlossaryTopic"("enabled");
