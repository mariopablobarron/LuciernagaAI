---
name: nextjs16-feature-delivery
description: "Implementa o modifica funcionalidades en Next.js 16 App Router con TypeScript, API routes y servicios del proyecto. Usar para features, bugfixes y refactors pequeños sin romper contratos existentes. Keywords: nextjs 16, app router, route handlers, chat, admin, api, typescript, feature, bugfix."
argument-hint: "Objetivo funcional, rutas afectadas y criterio de aceptacion"
user-invocable: true
---

# Next.js 16 Feature Delivery

## Cuando usar

- Nuevas funcionalidades en frontend o API.
- Bugfixes en chat, admin o autenticacion.
- Cambios que tocan componentes, rutas App Router y servicios en src/services.

## Procedimiento

1. Revisar contexto tecnico en README y AGENTS antes de editar.
2. Ubicar flujo afectado en src/app, src/components, src/services y src/lib.
3. Aplicar cambios minimos y compatibles con contratos actuales.
4. Si hay cambios de negocio, actualizar validaciones y manejo de errores.
5. Ejecutar pruebas focalizadas y build/lint si el impacto lo amerita.
6. Reportar riesgos residuales y proponer pruebas faltantes.

## Checklist de calidad

- No romper respuestas JSON esperadas por cliente.
- Mantener seguridad de rutas admin y sesiones.
- Preservar trazabilidad de logs y errores.
- Verificar escenarios de fallback en IA y red.

## Referencias del repo

- Arquitectura y flujo: ../../README.md
- Reglas Next.js del repo: ../../AGENTS.md
- Motor de decisiones: ../../DECISION_ENGINE.md
