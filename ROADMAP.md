# ROADMAP — Mejoras UX pendientes

30 mejoras propuestas pensando en el usuario en estado emocional difícil. Las 5 de mayor impacto se implementaron el **2026-05-18** (sesión Claude). Las **25 restantes** quedan aquí ordenadas por área y con estimación de esfuerzo, para que cualquiera (Mario, Claude futuro, equipo) pueda retomar sin contexto previo.

## Implementadas (2026-05-18)

| # | Feature | Estado |
|---|---|---|
| 14 | "Demasiado mal para escribir" — overlay con respiración + crisis line | ✅ Producción |
| 2 | Modo incógnito (no persiste drafts en localStorage) | ✅ Producción |
| 6 | Modo lectura tranquila (reduce vibrancia + animaciones) | ✅ Producción |
| 30 | Botón "esto no me sirvió" por respuesta del mentor | ✅ Producción |
| 10 | Salida de emergencia siempre visible | ✅ Cubierta por #14 (trigger encima del input) |
| 22 | Reconocer cuando NO puede ayudar — detector + banner profesional | ✅ Producción |
| 18 | Hitos sin gamificación — texto humilde en empty state | ✅ Producción |
| 24 | Sin saludos genéricos — regla en BASE_PROMPT | ✅ Producción |
| 20 | Modo "no me interpretes" — toggle + flag al prompt | ✅ Producción |
| 21 | Slider de verbosidad 1-5 — flag al prompt | ✅ Producción |
| 3 | Indicador "¿qué sabemos de ti?" — modal con datos del usuario | ✅ Producción |
| 4 | Exportar a Markdown cliente-side desde el modal de "Mis datos" | ✅ Producción |
| 5 | Auto-borrado opcional tras 30 días de inactividad | ✅ Producción (cron VPS 04:00 UTC) |
| 8 | Reduce motion automático tras crisis (30 min silenciosos) | ✅ Producción |
| 11 | Caja respiración 4-7-8 permanente — pill 'Respirar' + modal | ✅ Producción |
| 9 | Tamaño fuente — atajos teclado Ctrl/Cmd+/-/0 + toast | ✅ Producción |
| 19 | Bookmark mensajes del mentor — botón + modal con lista | ✅ Producción |

## Pendientes — ordenadas por área

### Anonymous-first

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 1 | Borrado instantáneo con swipe | 4-6h | Swipe horizontal en bubbles → confirmación + animación + DELETE en BD. Refuerza la promesa de borrar todo. |

### Accesibilidad

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 7 | Modo una sola mano | 8-12h | Toggle que mueve input + botones a un lado (izq/dch). Swipe-para-enviar. Para usuarios en cama, con bebé en brazos. |

### Crisis y post-crisis

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 12 | Post-crisis check-in 24h | 4-6h | Si user activó panel crisis hoy, cron al día siguiente envía email "¿cómo estás hoy?". Requiere opt-in explícito y unsubscribe trivial. |
| 13 | Recursos por país en tiempo real | 4-8h | Hoy crisis-hotlines.ts tiene 12 países hardcoded. Integrar con [findahelpline.com](https://findahelpline.com/) API o equivalente para los que faltan. |

### Continuidad y relación

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 15 | Resumen al volver tras 24h+ | 6-8h | Modificar pipeline `processMessage` para inyectar resumen automático si última conversación >24h. Memoria semántica light. |
| 16 | Citar lo que dijiste antes | 6-8h | Mejorar retrieval del historial en el LLM. Prompt engineering + few-shot examples. |
| 17 | Detectar y nombrar bucles | 8-12h | Análisis cross-conversación de tópicos. Heurística semantic embedding o keyword. Solo activar si bucle ≥3. |

### Calidad del mentor

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 23 | Pausa deliberada en mensajes serios | 4-6h reales | Requiere buffering de stream tokens en frontend (más complejo de lo estimado). Valor marginal vs latencia natural + typing indicator. Reevaluar si feedback lo pide. |

### Inclusividad material

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 25 | Versión low-bandwidth | 8-12h | Variant del chat sin gradientes, sin animaciones, sin Sparkles. Toggle en settings o auto-detect connection.effectiveType. |
| 26 | Modo offline básico | 6-8h | Service Worker que cachea últimas 50 respuestas. PWA shell. |
| 27 | Verificar cero login obligatorio | 2-3h | Auditoría: revisar middleware.ts y cada `/journey`, `/community`, `/impulso`. ¿Cuáles requieren auth innecesariamente? |

### Familias y entorno

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 28 | Cartas a alguien (sin enviar) | 8-12h | Nuevo modelo Letter en Prisma. Storage local Y BD. El mentor las revisa con permiso del usuario, devuelve preguntas. |
| 29 | Compartir frase del mentor anónimamente | 4-6h | Click → genera shareable card (imagen 1080x1080 o URL corta). UTM tag para tracking. Solo la frase, sin contexto. |

---

## Decisión de priorización

Las 25 anteriores suman ~140-200h de trabajo. **No** se debe abordar como sprint masivo (memoria operativa "no big rewrite"). Recomendación:

1. **Inmediato (1 semana)**: #18, #20, #21, #23, #24 — mejoras del mentor LLM, todas pequeñas, prompt engineering.
2. **Corto plazo (2-3 semanas)**: #1, #3, #11, #15, #19 — refuerzan anonymous-first + memoria del mentor.
3. **Medio plazo (1-2 meses)**: #25, #26, #27, #28, #29 — features de mayor calado.
4. **Aparcado hasta tener datos**: #16, #17 — requieren tráfico real para medir ROI.

## Cómo retomar

Para abordar una de las pendientes:
1. Lee la fila correspondiente arriba (estimación + notas).
2. Revisa la implementación de las 4 ya hechas (#14, #2, #6, #30) como referencia de patrón (componente + endpoint + i18n × 4 + tests).
3. Sigue las reglas no-negociables documentadas en [OPERATIONS.md §12](OPERATIONS.md) (política "no new shiny" antes de empezar).

---

_Origen: lista de 30 mejoras pedidas por Mario a Claude el 2026-05-18. Versión inicial sin priorizar disponible en el transcript de la sesión._
