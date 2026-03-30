---
name: Review Seguridad Profunda
description: "Realiza un security review profundo de cambios de codigo con foco en auth, autorizacion, secretos, validacion de inputs y exposicion de datos."
argument-hint: "PR, rama o archivos a revisar; superficie de ataque y contexto de negocio"
agent: "Desarrollo Completo"
---
Haz un review de seguridad profundo del cambio indicado por el usuario.

Objetivo principal:
- Detectar vulnerabilidades explotables o de alto riesgo, incluyendo fallas de autenticacion, autorizacion, manejo de sesiones/tokens, inyecciones, fuga de secretos, exposicion de datos sensibles y validacion insuficiente de entradas.

Enfoque recomendado (OWASP + contexto real del cambio):
1. Traza superficies de ataque: endpoints, acciones admin, webhooks, integraciones externas, persistencia y logs.
2. Evalua controles de identidad y permisos: authn, authz, tenancy, escalation horizontal/vertical.
3. Revisa entradas y salidas: sanitizacion, validacion, serializacion, inyeccion (SQL/command/template), SSRF/path traversal.
4. Inspecciona secretos y datos sensibles: claves hardcodeadas, leaks en errores/logs, almacenamiento inseguro, cifrado ausente.
5. Verifica mecanismos anti abuso: rate limit, idempotencia, replay, CSRF (cuando aplique), brute force.
6. Señala impacto explotable y probabilidad realista.

Formato de salida obligatorio:
1. Hallazgos (primero), ordenados por severidad: Critico, Alto, Medio, Bajo.
2. Para cada hallazgo incluye:
- Titulo corto
- Vector de ataque
- Impacto
- Evidencia con ruta/linea
- Recomendacion concreta (incluye fix rapido y fix robusto si aplica)
3. Pruebas de seguridad faltantes (unitarias/integracion/e2e) con casos concretos.
4. Preguntas abiertas o supuestos que bloqueen certeza.
5. Resumen ejecutivo breve (riesgo global y prioridad de mitigacion).

Reglas:
- Prioriza vulnerabilidades reales y explotables sobre mejoras cosmeticas.
- No inventes archivos, lineas ni resultados de ejecucion.
- Si no hay hallazgos, dilo explicitamente y reporta riesgos residuales y cobertura faltante.
