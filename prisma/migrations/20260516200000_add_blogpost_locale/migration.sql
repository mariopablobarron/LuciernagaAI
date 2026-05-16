-- BlogPost.locale: idioma del post (es/en/pt/fr). Cada post pertenece a UN
-- locale. Mismo slug puede coexistir en distintos idiomas (ej:
-- "/blog/mi-articulo" en es y en).
--
-- Para users históricos: todos los posts existentes quedan en español por
-- compatibilidad. El API público filtra por locale del usuario y hace
-- fallback a "es" cuando no hay versión en su idioma.
ALTER TABLE "BlogPost" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es';

-- Reemplazar el unique de slug por compuesto (slug, locale).
-- Si el unique tiene otro nombre en algún entorno, este IF EXISTS lo cubre.
DROP INDEX IF EXISTS "BlogPost_slug_key";

CREATE UNIQUE INDEX "BlogPost_slug_locale_key" ON "BlogPost"("slug", "locale");

-- Index para queries del API público (locale activo + status published, ordenado).
CREATE INDEX "BlogPost_locale_status_publishedAt_idx"
  ON "BlogPost"("locale", "status", "publishedAt");
