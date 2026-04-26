-- Versionado del consentimiento aceptado por cada usuario. Nullable para
-- compatibilidad con users registrados antes de esta columna. Se rellenará
-- al re-aceptar tras la próxima publicación de Términos/Privacidad.
ALTER TABLE "User" ADD COLUMN "consentVersion" TEXT;
