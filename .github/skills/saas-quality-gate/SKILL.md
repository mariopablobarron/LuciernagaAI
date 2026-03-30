---
name: saas-quality-gate
description: "Ejecuta una compuerta de calidad antes de merge o release: pruebas focalizadas, regresion de endpoints criticos y chequeo de riesgos. Usar para validacion final de cambios en chat, auth, admin y estado emocional. Keywords: qa, testing, regression, jest, quality gate, release."
argument-hint: "Alcance del cambio y nivel de rigor (rapido, medio, completo)"
user-invocable: true
---

# SaaS Quality Gate

## Cuando usar

- Antes de merge a rama principal.
- Antes de despliegue a staging o produccion.
- Cuando se toca logica de riesgo, auth o motor conversacional.

## Procedimiento

1. Identificar superficies impactadas por el cambio.
2. Ejecutar pruebas unitarias/integracion del dominio afectado.
3. Validar endpoints criticos: chat, auth token, health, ready, admin insights.
4. Revisar errores nuevos de build/lint/test.
5. Confirmar que no hay regresiones en flujos de crisis y evitacion.
6. Entregar reporte de salida: aprobado, aprobado con riesgo o bloqueado.

## Criterios de salida

- Build exitoso.
- Suite de pruebas relevante en verde.
- Endpoints de salud correctos.
- Sin hallazgos criticos de seguridad o datos.

## Referencias del repo

- Testing config: ../../jest.config.mjs
- Scripts: ../../package.json
- Manual operativo: ../../docs/manual-saas-50p.md
