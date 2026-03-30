---
name: prisma-migration-ops
description: "Gestiona cambios de esquema y migraciones Prisma en entorno de desarrollo de forma segura. Usar para agregar campos/modelos, aplicar migrate dev, verificar drift y validar impacto en servicios. Keywords: prisma, migration, schema, postgres, drift, database, model."
argument-hint: "Cambio de datos requerido, impacto esperado y entorno"
user-invocable: true
---

# Prisma Migration Ops

## Cuando usar

- Cambios en prisma/schema.prisma.
- Nuevas entidades o relaciones.
- Errores por drift entre migraciones locales y base de datos.

## Procedimiento

1. Definir claramente el cambio de dominio y revisar relaciones existentes.
2. Editar schema.prisma manteniendo nombres y convenciones del proyecto.
3. Ejecutar estado de migraciones y detectar drift antes de migrar.
4. Crear migracion descriptiva con migrate dev.
5. Validar que Prisma Client y rutas/API afectadas sigan funcionando.
6. Correr pruebas de servicios/endpoints impactados.

## Guardrails

- No borrar migraciones historicas aplicadas.
- Evitar cambios destructivos sin plan de datos.
- Nombrar migraciones por intencion del cambio.
- Documentar implicaciones en reportes/admin cuando afecte insights.

## Referencias del repo

- Esquema: ../../prisma/schema.prisma
- Migraciones: ../../prisma/migrations
- Persistencia en app: ../../src/lib/prisma.ts
