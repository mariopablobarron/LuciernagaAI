-- Persistir respuestas crudas del cuestionario de eneagrama (90 ítems Likert
-- 1..5) para poder mostrarlas en la ficha del usuario y dar contexto al
-- equipo al revisar resultados. Nullable porque los assessments anteriores
-- a esta migración no tienen las respuestas (solo el resultado).
ALTER TABLE "EnneagramAssessment" ADD COLUMN "rawAnswers" JSONB;
