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
| 1 | Swipe-to-delete en lista de conversaciones (touch) | ✅ Producción |
| 12 | Post-crisis check-in email 24h después (silencioso, opt-out trivial) | ✅ Producción |

## Pendientes — ordenadas por área

### Anonymous-first

| # | Feature | Estimación | Notas |
|---|---|---|---|

### Accesibilidad

| # | Feature | Estimación | Notas |
|---|---|---|---|
| 7 | Modo una sola mano | 8-12h | Toggle que mueve input + botones a un lado (izq/dch). Swipe-para-enviar. Para usuarios en cama, con bebé en brazos. |

### Crisis y post-crisis

| # | Feature | Estimación | Notas |
|---|---|---|---|
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

## Fixes de calidad del chat (sesión 2026-05-24/25)

No son items del ROADMAP de 30 features — son fixes de **calidad y observabilidad** que salieron de auditar conversaciones reales en producción. Documentados aquí para que la próxima sesión no los olvide.

### Auditoría de conversaciones reales

Sacar 5 conversaciones con ≥3 turnos del usuario en últimos 30 días. Hallazgos concretos con ejemplo:

| Patrón | Evidencia |
|---|---|
| Bucle "Hay algo de antes que seguimos sin cerrar..." | Convo `cmpc71rz...` — 14 turnos consecutivos. Usuario suplica "Deja de pedirme el email". |
| Bucle pisa la crisis aguda | Misma convo: T45 "estoy cansada de vivir" → T50 dispara 024 → T52/54/56 vuelve al bucle. |
| Rechazo activo de cambio de idioma | Convo `cmpff1w...` — usuario PT pide "Em português". Mentor responde ES: "Respondo siempre en español, trabajo mejor así". |
| Plantilla repetida ante gibberish | Convo `cmon4fb...` — "Hoka" / "Hzhshdhs" → mentor responde MISMA plantilla 3 turnos seguidos. |

### Fixes desplegados

| Commit | Qué |
|---|---|
| `8ddbff9` | `anti-loop.ts` — detecta protesta del usuario, cuenta repeticiones recientes, bypass total tras crisis. 14 tests. Aplicado a enrich.ts en los 2 sitios que generaban el bucle. |
| `8ddbff9` | `buildLocaleGuidance` (×4 idiomas) — el LLM ya NO inventa "Respondo siempre en español, trabajo mejor así". Ahora indica el selector. |
| `0c31b68` | Observabilidad logger: `route`, `durationMs`, `statusCode`, `userId` ahora se populan en SystemLog (antes 0%). Aplicado a `/api/chat`. |
| `12a4e43` | `input-quality.ts` + intercept en orchestrator. Detecta gibberish (sin vocales, baja diversidad ≥7 chars) y too_short (<5). 4 variantes por idioma con rotación. 21 tests. Cero llamada al LLM en estos casos. |
| `4799f50` | Multilingualización completa de strings hardcoded: `buildFallbackResponse`, `buildActionRequiredMessage`, `captureEmailPrompt`, `paywallMessage`, `appendConversionPrompt`. Antes solo ES, ahora 4 idiomas. |
| `4799f50` | `language-request.ts` — detector con 14 patrones multi-idioma. Override del locale en runtime + persistencia en User.locale fire-and-forget. 9 tests. |

### Infra

| Commit | Qué |
|---|---|
| `c69d925` + `0c32894` | `command_timeout: 30m` (antes 20) y `timeout-minutes: 35` (antes 25) en vps-direct-deploy.yml. Razón: build cold sin cache + container health check excedía 20m. |
| (manual VPS) | `pull_policy: never` añadido al docker-compose. El switch manual a una imagen local ya no intenta pull spurious. |
| `scripts/reset-superadmin-password.mjs` | Script idempotente para sincronizar AdminUser.passwordHash con `ADMIN_PASSWORD` del .env-vars. Útil cuando se rota el secret. |

### Validado E2E en producción 2026-05-25 ~07:24 UTC

- POST `/api/chat` con `"Háblame em português por favor"` y `locale: es` → log `language_override_from_chat from=es to=pt` ✅, User.locale actualizado a `pt` en BD ✅, respuesta en pt-PT con tu+enclisis ✅.
- POST con `"Hoka"` → intercept ambiguous_input, respuesta scripted, cero LLM call ✅.
- 3 variantes distintas en 4 requests separados por 2s — rotación funciona ✅.

### Lecciones operativas nuevas (en memoria de proyecto)

- `reference_deploy_validation.md` — siempre verificar VPS Direct Deploy además de CI. Lección del 24-05.
- `incident_vps_docker_overload_20260524.md` — NUNCA `systemctl restart docker` en producción sin canal alternativo. Genera load >700.
- `incident_i18n_orphan_purge_20260517.md` — NO borrar keys sin smoke test de la home.

_Sesión cerrada con 17 features ROADMAP en producción + 6 fixes profundos de calidad + observabilidad nueva + 1 incidente VPS resuelto._

---

_Origen: lista de 30 mejoras pedidas por Mario a Claude el 2026-05-18. Versión inicial sin priorizar disponible en el transcript de la sesión._
