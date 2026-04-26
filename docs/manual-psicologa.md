# Manual para la Psicóloga Responsable — Tres Mil Millones de Latidos

> Documento de onboarding clínico para la profesional que asume la responsabilidad psicológica de la plataforma. Léelo entero antes de firmar nada ni activar ningún sistema.

---

## Índice

1. [Qué es Tres Mil Millones de Latidos y qué no es](#1-qué-es-luciérnaga-y-qué-no-es)
2. [Marco pedagógico — léelo con atención](#2-marco-pedagógico)
3. [Tu rol y alcance de responsabilidad](#3-tu-rol-y-alcance)
4. [La experiencia del usuario final](#4-la-experiencia-del-usuario)
5. [Tu panel clínico](#5-tu-panel-clínico)
6. [Sistema de detección de riesgo](#6-detección-de-riesgo)
7. [Sistema de intervenciones](#7-intervenciones)
8. [Notas clínicas y evaluaciones](#8-notas-clínicas-y-evaluaciones)
9. [Sistemas automáticos con impacto clínico](#9-sistemas-automáticos)
10. [Videos avatar — atención especial](#10-videos-avatar)
11. [Límites éticos de la plataforma](#11-límites-éticos)
12. [Protocolo de crisis — qué debe pasar y en qué orden](#12-protocolo-de-crisis)
13. [Rutina clínica recomendada](#13-rutina-clínica)
14. [Lo que necesito que revises y firmes antes del lanzamiento](#14-revisión-previa-al-lanzamiento)
15. [Cómo acceder y cómo pedir cambios](#15-acceso-y-cambios)

---

## 1. Qué es Tres Mil Millones de Latidos y qué no es

**Tres Mil Millones de Latidos** (nombre comercial: *Tres Mil Millones de Latidos*) es una plataforma de acompañamiento emocional y clarificación personal dirigida a personas que atraviesan momentos de bloqueo, duda, ansiedad o transición vital. Combina un chat conversacional con un mentor basado en IA, un sistema de objetivos y acciones, check-ins diarios y herramientas de reflexión.

**Lo que Tres Mil Millones de Latidos NO es:**

- **No es psicoterapia.** No sustituye a una consulta con terapeuta profesional.
- **No es una herramienta clínica diagnóstica.** Las "evaluaciones" que aparecen en la plataforma son instrumentos de autoconocimiento, no diagnóstico.
- **No es un servicio de atención a urgencias psiquiátricas.** Aunque tiene protocolo de crisis, no reemplaza al 112, al teléfono de la esperanza (024), ni a servicios de urgencias.
- **No es un espacio de ventilación ilimitada.** El mentor interpela, no solo escucha — está diseñado para ordenar pensamiento y mover a la acción, no para contener crónicamente.

**Lo que sí es:**

- Un acompañamiento sostenido entre sesiones de terapia (para los que tienen terapeuta).
- Un primer punto de contacto estructurado para personas que aún no saben pedir ayuda profesional.
- Una herramienta de auto-observación con retroalimentación inteligente.
- Un sistema que identifica patrones emocionales y los devuelve al usuario para que los vea.

Esta distinción es **crítica para tu trabajo aquí**. Si en algún momento ves que la plataforma está actuando como si fuera terapia — o peor, sustituyéndola — es tu responsabilidad señalarlo.

---

## 2. Marco pedagógico

Tres Mil Millones de Latidos tiene cuatro principios hardcoded en el sistema y en sus prompts. Debes conocerlos porque guían las respuestas del mentor a los usuarios:

1. **Interpelar antes que instruir.** El mentor no dice "tienes que hacer X". Pregunta. Hace visible lo que el usuario no está viendo.
2. **Preguntas antes que respuestas.** Las respuestas cierran. Las preguntas abren.
3. **De lo local a lo global.** Empieza por el dato concreto del usuario, no por marcos genéricos.
4. **El cambio viene desde dentro.** No se empuja al usuario — se acompaña al lugar donde pueda verse a sí mismo.

Cuatro cosas que el sistema tiene **explícitamente prohibido** hacer en sus respuestas, y que debes vigilar:

- Usar imperativos huecos: *"deberías", "tienes que", "sigue así", "tú puedes", "no te rindas"*.
- Validar sin contexto: *"qué valiente por intentarlo"*, *"lo estás haciendo genial"* sin anclaje en hechos reales.
- Felicitar rápido al completar objetivos (prohibido en el cierre de videos y en los mensajes del mentor).
- Reforzar dependencia emocional del usuario hacia el sistema.

**Si encuentras una respuesta del mentor que viola estos principios, repórtalo al equipo técnico.** Hay validadores automáticos, pero fallan.

---

## 3. Tu rol y alcance

### Tu rol

Eres la **psicóloga responsable del criterio clínico de la plataforma**. No atiendes 1:1 a usuarios — esa no es la arquitectura del producto. Tu trabajo es:

1. **Revisar y aprobar** los sistemas automáticos con impacto psicológico (detección de riesgo, intervenciones, plantillas de prompts del mentor en momentos sensibles).
2. **Monitorizar** usuarios con riesgo elevado a través del panel clínico.
3. **Escalar** los casos que superan el alcance de la plataforma (derivación a terapeuta externo, urgencias, contacto con familia).
4. **Documentar** observaciones clínicas sobre usuarios específicos cuando proceda (notas clínicas).
5. **Formar** al equipo sobre los límites de lo que la plataforma puede y no puede hacer.
6. **Firmar** los documentos que requieren criterio profesional (protocolo de crisis, plantillas de intervención, assessments utilizados).

### Lo que NO es tu rol

- No estás haciendo terapia a los usuarios de Tres Mil Millones de Latidos. La plataforma no sustituye a un terapeuta propio.
- No eres moderadora de contenido de comunidad (eso lo hace el equipo con los reportes de usuarios).
- No eres responsable del soporte técnico ni del marketing.

### Cómo pedir cambios

Tienes criterio vinculante sobre:

- Las plantillas de prompts que el sistema usa en momentos clínicamente sensibles.
- Los umbrales de detección de riesgo.
- El protocolo de intervención y qué acciones automatiza el sistema.
- La lista de assessments que se muestran al usuario.
- Cuándo se activa el contacto con familia / contacto de confianza.

Si algo de esto no te convence, pides el cambio por escrito al equipo técnico y **no se activa hasta que firmes**. Esto es no negociable.

---

## 4. La experiencia del usuario

Para evaluar lo que vas a supervisar, tienes que haber vivido lo que el usuario vive. **Haz una cuenta de prueba con tu propio email** antes de empezar. Explora durante 2-3 días.

### Primera vez: onboarding

1. El usuario llega por una landing pública. Si hace el test emocional opcional (ruta `/test`), el sistema lo ubica tentativamente.
2. Crea una cuenta (email/password, Google, o código de aula B2B).
3. Se le presenta el coach vía un modal de bienvenida (puede incluir un video corto del fundador — ver §10).
4. Se le invita a iniciar un primer check-in y opcionalmente crear un primer objetivo.

### Día a día

- **Chat con el mentor**: conversación abierta. El mentor usa Claude (Anthropic) vía OpenRouter, con contexto de estado emocional del usuario y sus objetivos activos. No es ChatGPT genérico — está calibrado con el marco de Tres Mil Millones de Latidos.
- **Check-ins**: diarios, cortos (estado emocional + nota breve).
- **Objetivos y acciones**: el usuario declara objetivos con acciones concretas. El sistema las rastrea.
- **Modo Impulso**: versión intensiva de 21 días para usuarios que necesitan estructura mayor.
- **Diario personal**: entradas libres, visibles solo para el usuario (y para ti desde el panel clínico si tiene ese rol de usuario).
- **Comunidad**: foros de apoyo entre usuarios, moderados con sistema de reportes.
- **Integración con Telegram**: notificaciones, recordatorios, capacidad de hablar con el mentor desde el chat de Telegram.

### Qué ve el usuario que NO ve el profesional ajeno

- Insights automáticos sobre patrones emocionales.
- Sugerencias de acciones concretas muy acotadas en tiempo (ejemplo: "hoy solo haz esto: X, te llevará 10 minutos").
- Visualización de su propia trayectoria: estados emocionales en el tiempo, latidos acumulados (gamificación suave), rachas.
- Un portal familiar opcional donde designa un contacto de confianza.

---

## 5. Tu panel clínico

**Ruta:** `/admin-clinical`
**Roles:** `clinical`, `superadmin`

### Qué puedes hacer desde el panel

- **Ver la lista de usuarios** con su estado emocional actual, nivel de riesgo, última actividad, número de crisis registradas.
- **Filtrar por criterios clínicos**: usuarios en crisis activa, con riesgo alto, inactivos con historial sensible.
- **Abrir el detalle de un usuario** y ver:
  - Historial de estados emocionales (ficha del perfil actual; el gráfico temporal no existe todavía — se consulta el dato crudo del `UserState`).
  - Mensajes recientes del chat (con permiso `conversations:read`).
  - Objetivos activos y completados.
  - Check-ins.
  - Notas clínicas previas.
  - Eventos de crisis registrados.
  - Assessments completados. Para el test del Eneagrama ahora se guardan también las **respuestas crudas** de las 90 preguntas y aparecen en una tabla colapsable dentro de `/admin/users/[id]`. Útil para contextualizar el resultado o detectar patrones de respuesta. Si el usuario declaró su tipo sin hacer el test (atajo «Ya conozco mi tipo»), verás un badge "Declarado" en lugar de las respuestas.
- **Escribir notas clínicas** sobre ese usuario (endpoint disponible en `/api/admin/clinical-notes/[userId]`; la UI dedicada dentro del panel de detalle se añadirá en próxima iteración).
- **Crear intervenciones** dirigidas al usuario — **con UI integrada en el detalle del usuario**. El usuario las ve en un banner al abrir la app y las puede marcar como "Entendido".
- **Exportar PDF** con el historial completo para trasladarlo a un terapeuta externo si se deriva.

### Lo que NO puedes hacer

- Editar o borrar mensajes del usuario.
- Cambiar su plan de suscripción (eso es rol admin, no clínico).
- Enviar emails masivos (eso es rol marketing).
- Suplantar al usuario iniciando sesión como él.

### Permisos por rol

Tu rol es `clinical`. Incluye: `dashboard:read`, `crisis`, `users:read`, `users:export-pdf`, `users:emotional-history`, `conversations:read`, `insights:read`, `clinical:read`, `clinical:write`, `clinical-notes`, `interventions`, `assessments`.

---

## 6. Detección de riesgo

El sistema calcula automáticamente un `riskLevel` para cada usuario en tiempo real, con tres valores: `low`, `medium`, `high`. Los factores que suben el riesgo:

- Presencia de lenguaje de ideación suicida o autolesión en mensajes recientes.
- Estados emocionales sostenidos en `ansiedad`, `bloqueo` o `duda` por más de 14 días.
- Patrón `dominantPattern` = `evita_decidir` combinado con `energyLevel` = `bajo`.
- Inactividad prolongada después de un pico emocional negativo.
- Reportes en la comunidad o feedback con contenido preocupante.

Cuando `riskLevel = "high"` se dispara automáticamente:

- Alerta en tu panel clínico.
- Notificación por Telegram al equipo admin.
- Bloqueo (debe bloquear — ver §10 y §14) de ciertos sistemas automáticos que podrían hacer daño en ese estado.
- Prioridad en la cola de intervenciones manuales.

### Tu responsabilidad sobre la detección

- **Revisar semanalmente** la lista de usuarios en `riskLevel = "high"` aunque el sistema no te alerte (puede fallar).
- **Ajustar los umbrales** si ves que hay demasiados falsos positivos (usuarios etiquetados en alto riesgo sin justificación) o falsos negativos (usuarios que tú ves en riesgo pero el sistema no detecta).
- **Firmar la configuración actual** antes del lanzamiento. Si no la firmas, pedimos ajustes.

---

## 7. Intervenciones

Una **intervención** es un mensaje del equipo clínico dirigido a un usuario específico, que aparece en su app con visibilidad preferente. Tipos:

| Tipo | Cuándo usarla | Ejemplo |
|------|---------------|---------|
| `check-in` | El usuario muestra señales de deterioro emocional sostenido | "He visto que llevas dos semanas en un momento difícil. ¿Podemos hablar?" |
| `recurso` | Necesita información específica (teléfonos de ayuda, derivación) | "Aquí tienes el teléfono 024 de crisis. No es obligatorio llamar, pero sé que existe." |
| `derivación` | Supera el alcance de la plataforma | "Creo que lo que estás viviendo necesita un espacio profesional 1:1. Estos son los recursos que te sugiero." |
| `cierre` | Has resuelto/escalado el caso y quieres dejar registro visible al usuario | "He cerrado tu alerta de crisis. Estoy al tanto." |

### Estados de una intervención

- `sent` — enviada pero no leída por el usuario.
- `read` — leída pero sin acción.
- `resolved` — el usuario confirmó que la leyó y respondió.

### Cuándo crear una intervención

- Siempre que un usuario cruce `riskLevel = "high"` sin intervención previa reciente.
- Siempre que un evento de crisis (`CrisisEvent`) se registre.
- Cuando el sistema detecte un patrón que te preocupa y quieras hacerlo explícito.

### Cuándo NO

- Por cortesía general. Las intervenciones no son mensajes motivacionales.
- Para recordar al usuario que use la app (eso es marketing, no tú).
- Sin revisar antes el historial completo — una intervención mal calibrada puede hacer daño.

---

## 8. Notas clínicas y evaluaciones

### Notas clínicas

Campo libre en el panel clínico para anotar observaciones sobre un usuario. Visibilidad: solo roles `clinical` y `superadmin`. No son visibles para el usuario ni para marketing ni para admins generales.

**Qué documentar:**

- Cualquier intervención que hayas hecho, con fecha y razón.
- Derivaciones a terapeuta externo, con nombre del profesional si el usuario lo comparte.
- Eventos de crisis y cómo se resolvieron.
- Impresión clínica general que explique decisiones futuras.

**Retención:** las notas se conservan indefinidamente salvo que el usuario ejerza su derecho al olvido (GDPR). En ese caso se borran con el resto de sus datos.

### Evaluaciones (assessments)

El sistema incluye un conjunto de instrumentos que el usuario puede completar voluntariamente:

- PHQ-9 (síntomas depresivos — validado clínicamente, usar como screening, no diagnóstico).
- GAD-7 (ansiedad generalizada).
- Otros de auto-observación propios de Tres Mil Millones de Latidos (no validados clínicamente — son herramientas de conversación, no de diagnóstico).

**Tu responsabilidad:** decidir qué assessments mostrar al usuario, con qué frecuencia, y cómo interpretar los resultados visualmente.

**Automatización ya activa**: cuando un usuario completa un assessment con severidad `severe` (PHQ-9 ≥ 20, GAD-7 ≥ 15) o `moderately_severe` (PHQ-9 ≥ 15), el sistema:

1. Crea automáticamente una `Intervention` de tipo `resource` con mensaje personalizado por tipo de assessment (el contenido incluye el 024, recomendación de buscar profesional, y evita imperativos huecos).
2. Envía alerta automática al canal Telegram/email del equipo admin con `type: warning` y referencia al userId.
3. La `Intervention` aparece como banner en la app del usuario hasta que la marque como "Entendido".

Las plantillas de estos mensajes están en [src/app/api/user/assessment/respond/route.ts](src/app/api/user/assessment/respond/route.ts) — **revísalas y edítalas si no te convencen**.

---

## 9. Sistemas automáticos

Estos son los sistemas que actúan **sin intervención humana** y tienen impacto psicológico en el usuario. Debes conocerlos y aprobarlos antes del lanzamiento:

### 9.1. Respuestas del chat con IA

- Modelo: Claude Sonnet 4.6 (Anthropic) vía OpenRouter.
- Contexto que se le pasa: últimos mensajes, estado emocional, objetivos activos, perfil emocional.
- Prompt principal calibrado con el marco de Tres Mil Millones de Latidos (ver §2). Incluye instrucción explícita: **si el usuario pregunta si esto es terapia, el mentor responde que no lo es y sugiere buscar terapia profesional si hace falta**.
- **Fallback automático a crisis** si detecta lenguaje de autolesión/suicidio (`src/application/chat/phases/intercept.ts`) — en ese caso el modelo NO sigue conversando como coach, devuelve un mensaje corto con recursos de urgencia, dispara una alerta al canal Telegram del equipo admin (con cooldown 15 min) y registra un `CrisisEvent`.

### 9.2. Check-ins proactivos

- Diarios por Telegram (08:00 y 21:00 hora local del usuario).
- Semanales por email con resumen de su progreso.
- Pueden desactivarse desde los ajustes del usuario.

### 9.3. Detección de inactividad

- El sistema tiene un umbral configurable (default **3 días**) — si un usuario con `trustedContact` configurado y el flag `notifyOnInactivity` activado pasa más de N días sin abrir la app, se notifica al contacto de confianza.
- El umbral se puede subir por usuario desde los ajustes de `trustedContact`.
- **Acción pedida**: valida con tu criterio clínico si 3 días es el default correcto o si prefieres subirlo a 7 o 14 para evitar notificaciones ansiógenas al contacto.

### 9.4. Gamificación (latidos)

- Sistema de puntos suave (`latidos`) por cumplir acciones, mantener rachas, completar objetivos.
- **No hay rankings públicos** ni comparación competitiva entre usuarios — confirmado por código (cero menciones de "leaderboard").
- Los latidos sirven como feedback visual del progreso. Si hay canjes concretos activos lo consultas con el equipo.

### 9.5. Modo Impulso

- Programa estructurado con acción diaria concreta (una sola tarea acotada en tiempo por día).
- **Auto-pausa en crisis**: cuando el sistema activa el modo crisis de un usuario (`activateUserCrisis`), todos sus `UserChallenge` con status `active` se pasan automáticamente a `paused`. No se re-activan automáticamente — requiere acción manual del equipo clínico para reanudar.
- La lógica de duración y milestones del programa debe ajustarla el equipo contigo antes del lanzamiento si quieres parámetros concretos (ej: "21 días seguidos" o "auto-cierre al 3er fallo" — esos matices no están hardcoded y son decisión tuya).

### 9.6. Videos avatar (ver §10)

Sistema más reciente y el más clínicamente sensible. Tiene sección propia.

---

## 10. Videos avatar — atención especial

**Ruta admin:** `/admin/marketing/avatar-videos`

### Qué es

Un sistema que genera videos cortos (≈20 segundos) del fundador de la plataforma hablándole al usuario en momentos concretos de su viaje. Tres fuentes:

| Fuente | Cuándo aparece | Automático |
|--------|----------------|------------|
| **Bienvenida** | Al registrarse en la plataforma | Sí |
| **Arco del objetivo — inicio (START)** | Al crear un objetivo | Sí |
| **Arco del objetivo — medio (MIDPOINT)** | **Cuando el usuario está en estado emocional bajo** y el goal tiene ≥ 3 días | **Sí** |
| **Arco del objetivo — fin (END)** | Al completar un objetivo | Sí |
| **Broadcast manual** | El equipo de marketing decide enviar un video a un usuario o segmento | Manual |

### Por qué te debe preocupar el MIDPOINT

El MIDPOINT se dispara cuando el usuario cumple alguna de estas condiciones:

- `primaryEmotion ∈ {tristeza, ansiedad, miedo, frustración}`
- `state ∈ {bloqueo, ansiedad, duda}`
- `energyLevel = bajo`
- `transformationPhase = bloqueo`

Es decir: **un usuario que está mal recibe un video del fundador hablándole**. Esto tiene una lectura pedagógica defensible (un buen mentor aparece en los momentos duros, no solo en los hitos buenos), pero también tiene riesgos clínicos reales:

- **Gate de seguridad ya implementado**: el MIDPOINT **NO se dispara** si el usuario tiene `riskLevel = "high"` o `"critical"`, ni si tiene `crisisActive = true`. El filtro está en el `where` del cron (`src/services/goalAvatarVideos.ts` → `runMidpointScan`). Si quieres condiciones adicionales (ej: excluir usuarios con PHQ-9 severo en últimos N días), son 2 líneas más — pídelo.
- Si el guion generado por el LLM no supera los filtros pedagógicos (aunque hay validador automático que rechaza imperativos huecos), puede hacer daño. Revísalo en el historial del panel.
- La percepción del usuario de ser "detectado por un algoritmo en un momento frágil" puede sentirse invasiva o reconfortante — depende del caso. No hay forma de saber a priori cómo recibirá el mensaje una persona concreta. Vigila la tasa de opt-out en las primeras semanas como la señal más honesta.

### Las plantillas actuales del prompt

El sistema tiene tres plantillas editables desde el panel admin (una por fase: START, MIDPOINT, END). **La de MIDPOINT es la que tienes que revisar con más cuidado.** Actualmente dice (en esencia):

> Genera un guión hablado para acompañar al usuario en un momento difícil. Prohibido animar, prohibido validar rápido, prohibido dar consejos. Reconoce la dificultad. Termina con una pregunta que obligue al usuario a revisar si el objetivo sigue siendo suyo o lo heredó de quien creía que debía ser.

Esto se aplica a **cualquier estado emocional bajo**, sin distinguir tristeza moderada de ideación suicida. Necesitas:

1. Leer la plantilla exacta en el panel antes de aprobarla.
2. Editarla si te parece que no cubre el rango completo de situaciones clínicas.
3. Decidir si quieres plantillas distintas según severidad (ej: una para `medium` risk, otra para `high`).

### Lo que necesito que apruebes o rechaces

**Antes de activar el sistema** (está desactivado por defecto con `enabled = false`):

1. **Plantilla del MIDPOINT**: ¿te parece segura para cualquier usuario que cumpla los criterios? Si no, edítala desde el panel o exige sub-criterios más específicos.
2. **Bloqueo en crisis**: ya implementado — el MIDPOINT NO se dispara en `riskLevel ∈ {high, critical}` ni cuando `crisisActive = true`. Confirma si estas condiciones te parecen suficientes o quieres añadir más (ej: excluir también a usuarios con PHQ-9 severo en últimos 14 días).
3. **Opt-out proactivo**: actualmente el opt-out es reactivo (el usuario puede desactivar los videos futuros desde un botón en el modal). ¿Debería haber un opt-in explícito en lugar de opt-out? En ese caso el sistema solo dispararía videos a usuarios que hayan confirmado querer recibirlos.
4. **Review semanal de videos generados**: ¿quieres acceso a ver qué guiones generó el LLM para qué usuarios en qué momentos? Hay un historial disponible en el panel de admin/marketing/avatar-videos — pide acceso si no lo tienes.

---

## 11. Límites éticos

Estos son los principios éticos que la plataforma se compromete a mantener. Si ves que alguno se está vulnerando, es tu responsabilidad frenarlo.

### 11.1. La plataforma no sustituye a un terapeuta

- El coach NO diagnostica.
- El coach NO receta.
- El coach NO hace psicoterapia.
- En cualquier comunicación con el usuario donde él mismo plantee si "esto es terapia", el mentor responde que no lo es y sugiere terapia profesional complementaria.

### 11.2. Consentimiento informado

Al registrarse el usuario acepta que:

- Sus datos se procesarán para el funcionamiento del servicio.
- Un equipo clínico podrá revisar su información en casos de riesgo.
- Si hay indicios de autolesión/suicidio, puede contactarse con su contacto de confianza designado o con servicios de emergencia.
- Sus conversaciones se procesan por IA externa (Anthropic) bajo acuerdo de confidencialidad, pero no son totalmente privadas del servidor.

Si en algún momento crees que el consentimiento actual no es suficientemente explícito, pídenos revisarlo.

### 11.3. Privacidad y confidencialidad

- Tus notas clínicas son privadas del rol clinical.
- Los datos del usuario están cifrados **en tránsito** (TLS) y el acceso a la base de datos está restringido por credenciales. **NO hay encriptación a nivel de columna** — si un atacante obtiene acceso a la BD, verá los mensajes del chat en claro. Valora si esto es aceptable para los datos sensibles que la plataforma recoge y, en caso contrario, pide al equipo técnico que valore encriptación adicional para los campos más sensibles (ej: contenido de `ClinicalNote`, `Message`, `CrisisEvent.metadata`).
- No se venden ni se comparten datos con terceros.
- Procesamiento por IA: las conversaciones se envían a Anthropic (Claude) vía OpenRouter bajo contrato de privacidad, pero técnicamente los mensajes salen del servidor de Tres Mil Millones de Latidos.
- El usuario puede pedir **borrado completo GDPR** (hard delete, no soft delete) en cualquier momento vía `DELETE /api/user/account` — limpia también Stripe y elimina las notas clínicas asociadas.

### 11.4. Casos que superan el alcance

Debes derivar a terapeuta externo o servicios de emergencia cuando:

- Haya ideación suicida persistente con plan concreto.
- Haya indicios de psicosis activa (alucinaciones, delirios).
- Haya sospecha de abuso a menores o violencia doméstica activa.
- Haya dependencias severas (alcohol, drogas) sin tratamiento.
- Haya trastornos alimenticios graves sin supervisión médica.
- Haya autolesión reciente sin supervisión terapéutica.

**La plataforma puede acompañar después del tratamiento, no en lugar de él.**

### 11.5. Menores de edad

La plataforma declara ser para mayores de 16 años. Si detectas que un usuario menor está usando el servicio, escala al equipo técnico para verificar y, si procede, notificar a sus tutores.

### 11.6. Relación usuario-fundador

El fundador (Mario) aparece en videos del sistema (ver §10) y puede ser identificable. El usuario puede desarrollar una percepción parasocial sobre él. Es tu responsabilidad vigilar que esta percepción no se vuelva patológica (ej: usuarios que creen tener una relación personal con el fundador).

---

## 12. Protocolo de crisis

Este es el flujo que debe disparar el sistema cuando detecta un evento de crisis. **Revísalo antes del lanzamiento y propón cambios si no te convence.**

### Qué cuenta como "crisis"

Criterios ya activos en código:

- **Mensaje del usuario con lenguaje explícito de autolesión, suicidio o desesperanza vital** detectado vía patrones regex en [src/services/risk.ts:62-83](src/services/risk.ts#L62-L83) durante el análisis del chat. Dispara `interceptCrisis()` en [src/application/chat/phases/intercept.ts](src/application/chat/phases/intercept.ts).
- **Assessment completado con severidad `severe` o `moderately_severe`** (PHQ-9 ≥ 15 o GAD-7 ≥ 15) — dispara una `Intervention` automática de tipo `resource` con recursos de urgencia y alerta al equipo clínico. Ver [src/app/api/user/assessment/respond/route.ts](src/app/api/user/assessment/respond/route.ts).

Criterios **no implementados todavía** (pídelos si los quieres):

- Inactividad prolongada tras pico emocional negativo como disparador de crisis.
- Reporte externo (familia, contacto de confianza) vía portal familiar.

### Qué pasa cuando se detecta

1. **Inmediato (automático)**: el mentor deja de conversar como coach y envía un mensaje corto con el teléfono 024 (Línea de Atención a la Conducta Suicida), instrucciones básicas de urgencia, y ofrece contactar con su `trustedContact` si lo tiene configurado.
2. **En segundos**: se registra un `CrisisEvent` en base de datos.
3. **En segundos**: alerta automática al canal Telegram del equipo admin.
4. **En segundos**: tu panel clínico muestra el caso con prioridad máxima.
5. **Dentro de 1 hora (tú)**: revisas el caso. Decides una de estas acciones:
   - Crear intervención tipo `recurso` con mensaje personalizado.
   - Crear intervención tipo `derivación` si valoras que supera el alcance de la plataforma.
   - Contactar (con consentimiento previo del usuario) a su `trustedContact`.
   - En caso extremo, contactar con servicios de emergencia (112) si tienes datos de localización razonables y el riesgo es inminente.
6. **Tras la acción**: escribes una nota clínica con el caso y el resultado.
7. **24-72 horas después**: seguimiento — re-contactas al usuario vía intervención para validar su estado.

### Qué NO debe pasar y qué ya está cerrado en código

Reglas activas:

- ✅ **Videos avatar MIDPOINT bloqueados en crisis / riskLevel alto** (filtro en `runMidpointScan`).
- ✅ **Modo Impulso / UserChallenges se auto-pausan** cuando se activa el modo crisis (`activateUserCrisis` pasa todos los challenges activos del usuario a `paused`).
- ✅ **Fallback del chat en crisis**: el mentor deja de conversar como coach cuando detecta lenguaje de riesgo, responde con recursos de urgencia y registra el evento.

Reglas sin implementar todavía (pide su refuerzo si las consideras bloqueantes para lanzamiento):

- Prohibir check-ins gamificados de Telegram durante crisis activa — ahora mismo los crons de `telegram-checkin` no chequean `crisisActive`.
- Prohibir broadcasts de marketing (email/avatar) a usuarios en crisis — las rutinas de envío filtran por opt-out pero no por `crisisActive`.

### Duración del modo crisis

La variable de entorno `CRISIS_ACTIVE_HOURS` controla **cuántas horas permanece activo el flag `crisisActive`** en el `UserState` después de dispararse (no es una ventana horaria del día). Default 6h, mínimo 1, máximo 72. Durante ese tiempo se aplican los bloqueos listados arriba.

Fuera de ese periodo de crisis, el flag `crisisActive` vuelve a `false` automáticamente (por expiración temporal) o manualmente (`clearUserCrisis` desde el panel). **Decide si 6 horas es adecuado** o prefieres subirlo a 24 para cubrir la noche siguiente al evento.

---

## 13. Rutina clínica

Propuesta de rutina mínima. Ajústala a tu tiempo y experiencia.

### Diaria (15-20 min)

- Revisar alertas de crisis del día anterior.
- Revisar lista de usuarios con `riskLevel = "high"`.
- Responder intervenciones pendientes.

### Semanal (1-2 h)

- Revisar lista completa de usuarios en `riskLevel = "medium"` o `"high"`.
- Escribir notas clínicas de casos observados.
- Revisar métricas globales (número de crisis, intervenciones creadas, tasa de resolución).
- Leer 2-3 conversaciones completas de usuarios elegidos al azar (auditoría cualitativa del mentor).
- Revisar el historial de videos avatar generados esa semana — particularmente los MIDPOINT.

### Mensual (2-4 h)

- Análisis agregado: ¿los umbrales de riesgo están bien calibrados? ¿Hay falsos positivos o falsos negativos que justifiquen ajuste?
- Revisión de prompts del mentor: ¿siguen alineados con el marco pedagógico?
- Revisión de intervenciones: ¿qué tipos funcionan, cuáles no?
- Reunión con el equipo técnico para trasladar observaciones.

### Ad-hoc

- Cualquier caso que requiera escalar a servicios externos.
- Cualquier cambio en prompts o sistemas automáticos propuesto por el equipo debe pasar por tu firma.

---

## 14. Revisión previa al lanzamiento

Esto es lo que pido que revises y firmes **antes de que la plataforma tenga usuarios reales** o, si ya los tiene, antes de activar cualquier sistema que no estuviera activo. Un sí global no vale — necesito tu posición explícita en cada punto.

### Checklist

- [ ] **He creado una cuenta de prueba** y he usado el producto como usuario durante al menos 2 días.
- [ ] **He leído las plantillas de prompts** del mentor (tanto las del chat como las tres plantillas del avatar: START, MIDPOINT, END). Las apruebo como están, o las edito desde el panel antes de firmar.
- [ ] **He revisado los umbrales de detección de riesgo** y los apruebo o propongo ajustes.
- [ ] **He validado el protocolo de crisis** y el flujo de acciones automáticas. Firmo como está o propongo cambios.
- [ ] **He validado el bloqueo del MIDPOINT en crisis** (ya implementado: excluye `riskLevel ∈ {high, critical}` y `crisisActive = true`). Confirmo o exijo condiciones adicionales.
- [ ] **He validado los assessments** disponibles y sus puntuaciones de corte.
- [ ] **He revisado el consentimiento informado** del usuario en el registro.
- [ ] **He acordado una rutina de trabajo** con el equipo técnico (frecuencia de reunión, canal de comunicación, SLA para casos de crisis fuera de horario).
- [ ] **Tengo acceso al panel clínico** y he verificado que todos los datos que necesito ver son visibles.
- [ ] **Tengo mi contacto de emergencia** en la plataforma (para que el equipo técnico me alerte en crisis fuera de horario si es necesario).

Hasta que este checklist no esté completo, la plataforma no debería tener `AvatarVideoConfig.enabled = true`, ni debería aceptar nuevos registros en producción.

---

## 15. Acceso y cambios

### Cómo entrar al panel

URL: `https://tudominio.com/admin/login`
Te enviamos tu usuario y contraseña por canal seguro al incorporarte.
Tu rol es `clinical`.

### Si necesitas cambios en el sistema

Canal primario: correo al equipo técnico con asunto tipo "[CLINICAL] ajuste de ..." describiendo:

- Qué has observado.
- Qué cambio propones.
- Qué riesgo clínico mitiga.
- Urgencia (normal / bloqueante).

Respuesta dentro de 48h para cambios normales; respuesta dentro de 2h para cambios marcados como bloqueantes.

### Si detectas un bug con implicaciones clínicas

No esperes al canal normal. Escríbenos directamente por Telegram al canal de alertas admin o llama al contacto de emergencia técnica.

### Datos y reportes

Si necesitas exportar datos agregados para supervisión, investigación o publicación, pide al equipo un export específico. No extraigas datos sensibles directamente del panel sin autorización.

---

## Apéndice A — Glosario de variables del estado de usuario

El estado emocional interno de cada usuario se compone de varias variables. Te las explico porque vas a verlas mucho en el panel:

| Variable | Valores | Qué significa |
|----------|---------|---------------|
| `state` | `neutral`, `duda`, `bloqueo`, `ansiedad`, `claridad` | Estado emocional dominante actual |
| `primaryEmotion` | `calma`, `tristeza`, `ansiedad`, `miedo`, `frustración`, `alegría`... | Emoción primaria detectada en mensajes recientes |
| `dominantPattern` | `evita_decidir`, `aplaza`, `se_compara`, `se_auto_critica`, etc. | Patrón cognitivo-conductual dominante |
| `focusArea` | `propósito`, `relaciones`, `trabajo`, `salud`, `identidad`... | Área vital en la que el usuario está trabajando |
| `energyLevel` | `alto`, `medio`, `bajo` | Nivel de energía auto-reportado |
| `riskLevel` | `low`, `medium`, `high` | Nivel de riesgo clínico calculado |
| `transformationPhase` | `bloqueo`, `resistencia`, `exploración`, `integración`, `acción` | Fase del proceso de transformación |
| `crisisActive` | `true` / `false` | Si hay un evento de crisis abierto sin resolver |

Estas variables se actualizan en tiempo real tras cada interacción significativa del usuario.

---

## Apéndice B — Contactos de emergencia institucionales (España)

Estos son los que aparecen en los mensajes de crisis del mentor. Verifica que siguen vigentes antes del lanzamiento.

- **024** — Línea de Atención a la Conducta Suicida (Ministerio de Sanidad, 24/7, gratuita, confidencial).
- **112** — Emergencias generales.
- **016** — Violencia de género.
- **Teléfono de la Esperanza**: 717 003 717.
- **Unidades de Salud Mental de referencia** — verificar por comunidad autónoma del usuario si es posible.

Si detectas que alguno de estos recursos ha cambiado de número o ya no está operativo, repórtalo.

---

**Fin del documento.** Para cualquier duda que no cubra este manual, escríbeme directamente. Prefiero que preguntes diez veces antes que asumas una vez mal.

— *El equipo de Tres Mil Millones de Latidos*
