# Discovery Agent — guía de puesta en marcha

El **Discovery Agent** monitoriza Reddit cada 4 horas buscando conversaciones donde el producto aporta valor real. Las puntúa con LLM, redacta un borrador en voz de marca, y las envía como digest a Telegram. Tú apruebas desde `/admin/distribution` y publicas manualmente con tu cuenta personal.

**Diferencia clave con spam bots:** las respuestas las publicas TÚ desde tu cuenta `u/luciernaga-ai` (o la que uses). Cero cuentas falsas, cero personas suplantadas. El agente solo encuentra y prepara.

## Requisitos (10 minutos, una sola vez)

Reddit bloquea IPs de cloud/VPS para los endpoints JSON anónimos. Toca crear una app OAuth gratis (cualquier persona puede, lleva 2 min).

### 1. Crear app Reddit

1. Entra a [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) con tu cuenta personal
2. Abajo → **"create another app..."**
3. Rellena:
   - **name**: `tresmilmillonesdelatidos-discovery`
   - **type**: **script** (read-only, no requiere refresh tokens largos)
   - **description**: `Búsqueda de conversaciones para community marketing`
   - **about url**: `https://tresmilmillonesdelatidos.es`
   - **redirect uri**: `https://tresmilmillonesdelatidos.es` (no se usa pero es obligatorio)
4. Pulsa **create app**
5. Copia:
   - **client_id**: la cadena pequeña justo bajo el nombre (`xxxXXXxxxXXXxx`)
   - **client_secret**: el campo "secret" (`xxxxXXXxxxxXXXXxxxxXXXX`)

### 2. Añadir env vars en Coolify

En tu app `luciernaga-ai` → **Environment Variables**:

```
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
```

Redeploy.

### 3. Comprobar que funciona

```bash
curl -H "x-cron-secret: $CRON_SECRET" \
  https://tresmilmillonesdelatidos.es/api/cron/discovery
```

Deberías ver algo como:

```json
{
  "ok": true,
  "found": 12,
  "newCandidates": 12,
  "scored": 12,
  "notified": 3,
  "errors": []
}
```

Si `found: 0` y aparece `reddit_skipped_no_oauth` en los logs → faltan las env vars.

---

## Cómo funciona

### Cron diario

El VPS crontab corre el ciclo cada 4 horas:
```
0 */4 * * * curl -sf -H 'x-cron-secret: ...' \
  'https://tresmilmillonesdelatidos.es/api/cron/discovery' \
  >> /var/log/mentor-crons.log 2>&1
```

### Ciclo de un match

1. **Búsqueda global** por keyword (14 búsquedas) + **profundidad** en 4 subreddits clave (Desahogo, ansiedad, AnsiedadES, psicologia)
2. **Filtrado**: solo posts open, con selftext (no link-only), recientes, no archivados, no NSFW
3. **LLM scoring** con Haiku 4.5: cada match recibe score 0-10 + razonamiento + borrador
4. **Persist** en `DiscoveryMatch` con status=pending
5. **Notify Telegram**: top 5 con score ≥ 7

### Telegram digest

Recibes algo así:

```
🎯 Discovery — 3 oportunidades encontradas

9/10 — r/Desahogo
Llevo 3 meses sin poder empezar el TFM, no es vagancia, es algo más
https://reddit.com/r/Desahogo/comments/.../

8/10 — r/ansiedad
Ataques de pánico desde hace 6 meses, qué hago
https://reddit.com/r/ansiedad/comments/.../

7/10 — r/psicologia
Diferencia entre coach y psicólogo
https://reddit.com/r/psicologia/comments/.../

Revisar y aprobar: https://tresmilmillonesdelatidos.es/admin/distribution
```

### Flujo en `/admin/distribution`

1. Ves la lista ordenada por score
2. Lees el post original (link)
3. Revisas el borrador del LLM
4. **Editar** (si quieres ajustarlo) → guardar
5. **Aprobar** o **Rechazar**
6. Si aprobado: copia el borrador, pégalo como comentario en Reddit con tu cuenta, copia el URL del comentario y márcalo como "publicado" en el panel
7. Stats: cuántos pendientes, aprobados, publicados

---

## Subreddits monitorizados

Auditados con HTTP 200 (12-may-2026):

| Subreddit | Tipo | Por qué |
|---|---|---|
| r/spain | Generalista ES | Volumen alto |
| r/argentina | Generalista | Audiencia LATAM grande |
| r/mexico | Generalista | Audiencia LATAM más grande |
| r/Colombia, r/chile, r/peru | Generalista | Diversificación LATAM |
| r/AskRedditespanol | Q&A | Intent claro |
| r/Desahogo | **Mental health** | Admin terapeuta — match perfecto |
| r/Desahogos | Mental health | Variante alternativa |
| r/ansiedad | Mental health | Ataque directo |
| r/AnsiedadES | Mental health | Específico España |
| r/psicologia | Mental health | Debates sobre terapia/coach |

NO monitorizamos r/españa (la `ñ` rompe URL de Reddit), r/Productividad (404), r/Pareja (404), r/SaludMentalES (302, no existe realmente).

---

## Modelo de datos

```prisma
model DiscoveryMatch {
  id              String    @id
  platform        String    // "reddit" | future
  externalId      String
  externalUrl     String
  subredditOrTag  String?
  title           String?
  excerpt         String?
  authorHandle    String?
  postedAt        DateTime?
  matchedKeywords String[]
  llmScore        Int?      // 0-10
  llmReason       String?
  draftResponse   String?
  status          String    // pending|approved|rejected|published|failed
  approvedAt      DateTime?
  publishedAt     DateTime?
  publishedUrl    String?
  // ...
  @@unique([platform, externalId])
}
```

Re-correr el discovery NO duplica matches: `unique(platform, externalId)`.

---

## Costes esperados

| Item | Coste mensual |
|---|---|
| Reddit OAuth | 0 € (free tier) |
| LLM scoring (Haiku 4.5) | ~$0.50/mes con 100 matches/día |
| Total | <$1/mes |

---

## Fase 2.1 — Auto-publishing (YA DESPLEGADA)

El botón "Auto-publicar" publica el borrador en Reddit directamente con tu cuenta (sin copy-paste). Setup adicional:

### 1. Crear segunda app Reddit tipo **web app**

La app de tipo `script` de Fase 2 solo sirve para LEER. Para postear hace falta `web app`:

1. [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → "create another app..."
2. Tipo: **web app**
3. name: `tresmilmillonesdelatidos-publish`
4. **redirect uri**: `https://tresmilmillonesdelatidos.es/api/admin/distribution/reddit-oauth-callback` (literal exacto)
5. Crear. Copia `client_id` (bajo el nombre) y `secret`.

### 2. Env vars en Coolify

```
REDDIT_USER_CLIENT_ID=...
REDDIT_USER_CLIENT_SECRET=...
```

(Si reutilizas las de Fase 2 — `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — funciona igual, pero esas son para una app `script` que no soporta redirect. Mejor tener las dos por separado).

Redeploy.

### 3. Conectar tu cuenta

1. Ve a `/admin/distribution`
2. Banner arriba con botón **"Conectar Reddit"**
3. Reddit te pide aprobar los permisos (`identity`, `read`, `submit`) — pulsa "Allow"
4. Vuelves al admin con tu username conectado (`u/luciernaga-ai` o el que uses)
5. Los matches `pending` y `approved` ahora tienen botón naranja **"Auto-publicar"**

### 4. Flujo nuevo

| Paso | Antes (Fase 2) | Ahora (Fase 2.1) |
|---|---|---|
| Leer borrador | En `/admin/distribution` | Igual |
| Editar | Igual | Igual |
| Aprobar | Sí | Sí (opcional) |
| Publicar en Reddit | Manual: copia → pega → URL | **Un click "Auto-publicar"** |
| Marcar publicado | Manual: pega URL | Automático |

Los matches que fallen al auto-publicar (rate limit, token expirado, etc.) quedan en status `failed` con el error visible y un botón de "Reintentar".

### Token storage

Los refresh tokens se guardan en `IntegrationToken` (singleton por platform), con `unique(platform)`. Se refrescan automáticamente cuando caducan (50 min antes de la hora de expiración).

---

## Roadmap futuro

- **Hacker News** vía Algolia API (gratis, no necesita auth). Útil si publicas algo con ángulo técnico.
- **Análisis de tracción**: dashboard con tasa de aprobación, tráfico generado por respuesta, conversión a registros en tu web.
- **Iteración del prompt**: cuando tengas 20+ aprobaciones reales, refinamos el system prompt del scorer con tus preferencias.
- **Auto-replies a respuestas**: si alguien responde a tu comentario en Reddit, podrías recibir notificación Telegram con borrador.

---

## Si algo va mal

| Síntoma | Causa probable | Fix |
|---|---|---|
| `found: 0` y log `reddit_skipped_no_oauth` | Faltan env vars | Añadir `REDDIT_CLIENT_ID` + `_SECRET` en Coolify |
| `found: 0` con OAuth ok | Posts no encajan con keywords actuales | Editar `SEARCH_KEYWORDS` en `src/services/discovery/reddit.ts` |
| HTTP 401 en logs | Credenciales mal copiadas | Verificar client_id (sin espacios) |
| HTTP 429 frecuente | Rate limit | El código ya tiene polite delay 200-250ms. Si persiste, bajar volumen de keywords |
| Score siempre bajo | El system prompt es muy estricto | Editar `SYSTEM_PROMPT` en `llm-scorer.ts` |
