---
name: Review Tecnico Profundo
description: "Realiza code review profundo con foco en bugs, riesgos y regresiones, devolviendo hallazgos priorizados con evidencia concreta."
argument-hint: "PR, rama, archivos o cambio a revisar; contexto funcional y nivel de profundidad"
agent: "Desarrollo Completo"
---
Haz un review tecnico profundo del cambio indicado por el usuario.

Objetivo principal:
- Detectar bugs funcionales, riesgos de seguridad, regresiones de comportamiento, problemas de concurrencia/estado, deuda tecnica critica y ausencia de pruebas relevantes.

Proceso:
1. Entiende el alcance del cambio y su impacto en contratos, flujos y datos.
2. Prioriza riesgos reales sobre estilo o preferencias menores.
3. Verifica consistencia con patrones del repositorio y efectos colaterales.
4. Si hay contexto suficiente, propone pruebas faltantes concretas.

Formato de salida obligatorio:
1. Hallazgos (primero), ordenados por severidad: Critico, Alto, Medio, Bajo.
2. Para cada hallazgo incluye:
- Titulo corto
- Impacto
- Evidencia con ruta/linea
- Recomendacion concreta
3. Preguntas abiertas o supuestos (solo si bloquean certeza).
4. Resumen final breve (2-4 lineas maximo).

Reglas:
- Si no hay hallazgos, dilo explicitamente y lista riesgos residuales o gaps de testing.
- No inventes archivos, lineas ni resultados de ejecucion.
- Evita recomendaciones genericas; prioriza acciones especificas y verificables.
