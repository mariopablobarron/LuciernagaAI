# OPERATIONS — Tres Mil Millones de Latidos

Runbook operativo del producto. Lo que necesitas saber si vas a poner las manos en infra, deploys, secrets o incidentes. **No es documentación arquitectónica** (eso vive en el código y en `AGENTS.md`). Es lo que está montado **hoy**, dónde, con qué credenciales y qué hacer cuando algo falla.

> **Bus factor:** este documento existe para reducir la dependencia de una sola persona. Actualízalo cada vez que cambie infra, secrets o procedimientos. No te fíes de tu memoria — tampoco de la de Claude.

---

## 1. Resumen ejecutivo

- **Producto**: Mentor con IA en 4 idiomas (ES/EN/PT/FR) para acompañamiento emocional, anónimo desde el primer mensaje, con derivación a recursos de crisis por país.
- **URL producción**: https://tresmilmillonesdelatidos.es
- **Repo**: https://github.com/mariopablobarron/tresmilmillonesdelatidos (renombrado desde `LuciernagaAI` el 2026-05-17)
- **Identidad legacy**: el container Docker, scripts del VPS y logs todavía se llaman `luciernaga` o `luciernaga-ai`. No tocar; rebautizarlos rompe DNS, deploy y crons. Solo el repo se renombró.
- **Stack**: Next.js 14+ App Router · TypeScript · Prisma + Postgres 16 · next-intl · Tailwind v4 · OpenRouter (LLMs) · GA4 + Search Console · Resend (email) · Telegram bot.

---

## 2. Infra física

### VPS
- **Hostinger KVM 4**, ID `1456258`, IP `72.61.195.108`, Ubuntu 24.04 + Docker + Traefik.
- **SSH**: `ssh root@72.61.195.108` (clave Mario en su Mac, clave para GH Actions en `secrets.VPS_SSH_KEY`).
- **Panel Hostinger**: https://hpanel.hostinger.com/
- **MCP Hostinger**: tools `mcp__hostinger-mcp__*` disponibles para gestión VPS.

### DNS
- Dominio `tresmilmillonesdelatidos.es` → A `72.61.195.108`.
- Gestión en **IONOS** (NS `ui-dns.*`), **no** en Hostinger. `mcp__hostinger-mcp__DNS_*` NO sirve aquí; editar en https://my.ionos.com/.

### Containers Docker (en VPS)
Relevantes para este producto:
- `luciernaga-ai` — Next.js app, gestionada por compose en `/docker/luciernaga-ai-traefik/` (fuera de Coolify desde incidente 2026-04-30).
- `mentor-db` — Postgres 16 (user `mentor`, db `mentor_web`).

Otros proyectos comparten VPS: `startidea-web`, `hub-app`, `merch-app`, `chatwoot`, `nextcrm`, `raizyaccion`. No tocar a ciegas.

---

## 3. Deploy

### Auto-deploy activo
Mecanismo real (confirmado 5+ runs verdes consecutivos):

1. Push a `main` en https://github.com/mariopablobarron/tresmilmillonesdelatidos
2. GH Actions workflow [`vps-direct-deploy.yml`](.github/workflows/vps-direct-deploy.yml) hace SSH al VPS con `secrets.VPS_SSH_KEY` y ejecuta `/root/deploy-mentor-web.sh` (toda la lógica vive en el VPS, no en el YAML — permite restringir la SSH key con `command="..."`).
3. El script ejecuta: `git pull`, `docker build` (con `NODE_OPTIONS --max-old-space-size=2048` para evitar OOM tipo merch-2026-05-16), `sed` para tag nuevo en compose, `docker compose up -d`, smoke test `/api/health` (6 reintentos, ~60s), notif Telegram.
4. Tiempo total: ~4-5 minutos.

`paths-ignore` evita redeploy en `docs/**`, `*.md`, workflows de dev-journal/hardening-board/user-manual-pdf.

**Modificar la lógica de deploy**: editar `/root/deploy-mentor-web.sh` en el VPS (no el YAML). El YAML sólo invoca al script.

**Restringir SSH key de GH Actions (recomendado, ver `docs/setup-auto-deploy.md`)**: añadir `restrict,...,command="/root/deploy-mentor-web.sh"` antes de la pública en `/root/.ssh/authorized_keys`. Sin esto la key tiene root pleno.

### Deploy manual de emergencia
Si GH Actions cae, replicar a mano:
```bash
ssh root@72.61.195.108
cd /tmp/build-luciernaga && git pull --depth 1 origin main
COMMIT=$(git rev-parse --short HEAD)
docker build -t luciernaga-ai:$COMMIT .
cd /docker/luciernaga-ai-traefik/
sed -i "s|image: luciernaga-ai[^\"]*|image: luciernaga-ai:$COMMIT|" docker-compose.yml
docker compose up -d
docker logs --tail 25 luciernaga-ai
```

---

## 4. Secrets — dónde viven

**Coolify NO es la fuente de verdad para mentor-web** (la memoria global "Coolify=secrets" aplica a otros proyectos en este VPS). Para `luciernaga-ai`:

| Capa | Dónde | Notas |
|---|---|---|
| Runtime container | `docker exec luciernaga-ai env` | Inyectados desde el compose en `/docker/luciernaga-ai-traefik/.env-vars` (¡NO `.env`!). Ver sección 8b. |
| Build time (Next.js NEXT_PUBLIC_*) | env del build durante `docker build` en VPS | Para añadir `NEXT_PUBLIC_*` requiere rebuild, no solo restart |
| GH Actions (CI + deploy) | https://github.com/mariopablobarron/tresmilmillonesdelatidos/settings/secrets/actions | `VPS_SSH_KEY`, `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_ID` |
| Local dev | `/Users/STARTIDEA/mentor-web/.env` (Mac de Mario) | Sólo lo mínimo; no replica todo lo de producción |

**Cuándo necesites un secret**: `ssh root@72.61.195.108 'docker exec luciernaga-ai sh -c "echo \$VAR_NAME"'`.

---

## 5. Crons

### 15 crons del VPS (todos contra producción con `x-cron-secret`)
Configurados en `crontab -e` como root. Log: `/var/log/mentor-crons.log`.

| Schedule (UTC) | Endpoint | Función |
|---|---|---|
| `*/15 * * * *` | `/api/cron/scheduled-emails` | Drip emails programados |
| `0 2 * * *` | `/api/cron/purge-logs` | Purga logs > X días |
| `0 8 * * *` | `/api/cron/reminders` | Recordatorios diarios |
| `30 8 * * *` | `/api/cron/telegram-checkin?period=morning` | Check-in matutino |
| `0 9 * * *` | `/api/cron/action-reminders` | Acciones pendientes |
| `0 10 * * *` | `/api/cron/24h-nudge` | Nudge usuarios inactivos 24h |
| `2 10 * * *` | `/api/cron/7d-nudge` | Nudge inactivos 7d |
| `30 10 * * *` | `/api/cron/inactivity-check` | Audit inactividad |
| `0 21 * * *` | `/api/cron/telegram-checkin?period=evening` | Check-in nocturno |
| `5 23 * * *` | `/api/cron/daily-round-create` | Crear rondas diarias |
| `0 9 * * 1` | `/api/cron/weekly-summary` | Resumen lunes 9:00 |
| `0 10 * * 1` | `/api/cron/weekly-inactive-reminder` | Inactivos lunes |
| `0 18 * * 0` | `/api/cron/user-weekly-review` | Carta semanal domingo |
| `0 */6 * * *` | `/api/cron/email-health-check` | Health Resend cada 6h |
| `0 6 * * *` | `/api/cron/seo-sync` | GA4 + GSC sync diario |
| `0 */4 * * *` | `/api/cron/discovery` | Discovery cada 4h |

### Crons del host
| Schedule | Script | Función |
|---|---|---|
| `0 3 * * *` | `/root/backup-merch.sh` | Backup merch-db a Telegram (script en `crontab -l`) |
| `30 3 * * *` | `/root/scripts/mentor-db-backup.sh` | Backup mentor-db (cron en `/etc/cron.d/mentor-db-backup`, **no** en `crontab -l`) |
| `30 3 * * *` | `/usr/local/bin/raizyaccion-backup.sh` | Backup raizyaccion |

### Auditoría
- HTTP: `curl -H "x-admin-secret: $ADMIN_AUTH_SECRET" https://tresmilmillonesdelatidos.es/api/admin/cron-health`
- VPS: `tail -100 /var/log/mentor-crons.log`. Cada línea es JSON `{"ok":true,...}` o error.

### cron-job.org
**No usado** (migrado a crontab VPS el 2026-05-17). Si la memoria operativa dice lo contrario, está desactualizada. **Patrón confirmado de zombies**: 2 incidentes en 1 semana (2026-05-20 `/api/admin/backup`, 2026-05-25 `/api/cron/weekly-inactive-reminder`). Auditar cron-job.org tras cada migración y eliminar todo lo que apunte al dominio.

### Patrón obligatorio para crons que envían emails

Tras el incidente del **2026-05-25** (cron-job.org zombi llamó
`weekly-inactive-reminder` cada 15 min → 110 emails a 22 usuarios en 2h),
todo endpoint cron que envíe emails debe tener **al menos** las 2 primeras
capas, idealmente las 3:

1. **`withCronDedup(jobName, keyFn)` de `src/lib/cron-log.ts`** — lock
   distribuido con UNIQUE constraint en `CronRunLog.{jobName, dedupKey}`.
   Llamadas repetidas dentro de la ventana devuelven `dedup_lock` sin
   tocar BD ni sistema de email. Ventanas disponibles: `dailyUtcKey()`,
   `isoWeekKey()`. Es la capa CRÍTICA contra spam por caller mal portado.
2. **Dedup interno por usuario** — consultar la tabla relevante
   (`ScheduledEmail`, `WeeklyLetter`, status de capsule, etc.) antes de
   procesar cada item, registrar tras procesar. Protege contra el caso
   donde el lock se libere (ej. semanas cruzadas) o varios crons compartan
   estado.
3. **Flag en `notification-config.json`** — corte de emergencia legible
   en tiempo real (cache 30s) sin redeploy:
   ```bash
   ssh root@72.61.195.108 'docker exec luciernaga-ai sh -c \
     "echo \"{\\\"cronXYZ\\\": false}\" > /app/notification-config.json"'
   ```

**Verificación post-deploy** (2 curls seguidos):
```bash
curl -H 'x-cron-secret: ...' https://.../api/cron/<endpoint>
# 1ª: {ok:true, candidates:N, sent:M, ...}
curl -H 'x-cron-secret: ...' https://.../api/cron/<endpoint>
# 2ª: {ok:true, skipped:true, reason:"dedup_lock", dedupKey:"YYYY-Www"}
```

**Estado actual de los 6 endpoints que mandan emails** (auditoría
2026-05-26):

| Endpoint | Lock distribuido | Dedup interno |
|---|---|---|
| `24h-nudge` | ✅ `dailyUtcKey` | n/a (idempotente por crisis flag) |
| `7d-nudge` | ✅ `dailyUtcKey` | ✅ `nudge_7d` template + 14d |
| `weekly-inactive-reminder` | ✅ `isoWeekKey` | ✅ `ScheduledEmail` + 7d |
| `user-weekly-review` | ✅ `isoWeekKey` | ⚠️ pendiente (volumen bajo) |
| `weekly-letter` | n/a (dedup query) | ✅ `weeklyLetters.none {weekStart}` |
| `capsule-deliver` | ✅ `dailyUtcKey` | ✅ status pending→ready |

---

## 6. Backups

### mentor-db (Postgres principal)
- Script: `/root/scripts/mentor-db-backup.sh` (existente desde 2026-04-26, upload a Telegram añadido 2026-05-17)
- Cron: `/etc/cron.d/mentor-db-backup` → `30 3 * * *` (diario 03:30 UTC)
- Output: `/root/backups/mentor-YYYYMMDD-HHMM.sql.gz`
- Retención: 7 archivos en disco (última semana)
- Log: `/var/log/mentor-db-backup.log`
- **Upload diario a Telegram** (`@TRESMILMILLONESDELATIDOSBOT` → chat `678888`): si el `.sql.gz` cabe en 50MB, se sube como documento; si pasa, sólo notifica path local. Tokens en `/root/scripts/backup.env` (modo 600).
- **Alerta Telegram en fallo**: si `pg_dump` revienta, llega notificación al chat.
- **Test manual**: `ssh root@72.61.195.108 /root/scripts/mentor-db-backup.sh`
- **Recovery**: `gunzip < mentor-XXX.sql.gz | docker exec -i mentor-db psql -U mentor -d mentor_web`

> **Off-site real**: el chat de Telegram es backup independiente del VPS. Si el VPS se quema, los `.sql.gz` siguen accesibles desde el móvil. Sólo cubre ~7 días (retención del chat es indefinida, pero Telegram cliente paginariza viejos). Para histórico largo, considerar `rclone copy` a B2/S3.

> **Trampa**: el cron NO aparece en `crontab -l` porque vive en `/etc/cron.d/`. Para auditar todos los crons del root: `cat /etc/cron.d/*; crontab -l`.

### Coolify
- Cron diario 03:45 UTC backup de SQLite de Coolify (memoria `reference_coolify_db_backup.md`). Protege secrets de TODAS las apps.

---

## 7. Analytics y SEO

- **GA4**: `G-FHC95RN6FS`, GDPR consent-gated. Solo carga si `localStorage.cookie_consent === "true"`. **Esperado**: `view-source:` de la home no muestra `gtag` hasta consent. No es bug.
- **Search Console**: verification meta `X1wK9qLyt2L99gHGjvFlj4qlOR8jc_abOlDZc9JGFb0` presente en `<head>` de todas las páginas.
- **Google Cloud project**: `trusty-drive-495404-q9` (no `mentor-web-seo`). Service account: `mentor-web-seo@trusty-drive-495404-q9.iam.gserviceaccount.com`. JSON en env `GOOGLE_SERVICE_ACCOUNT_JSON_B64`.

---

## 8. Telegram

| Bot | Username | Uso |
|---|---|---|
| `@TRESMILMILLONESDELATIDOSBOT` | id `8666161869` | Producto + watchdog + backups |
| Chat admin | `678888` | Mario (mariopablobarron) |

Token en env del container (`TELEGRAM_BOT_TOKEN`). Para rotarlo: editar `/docker/luciernaga-ai-traefik/.env` + `docker compose up -d --force-recreate --no-deps app`.

---

## 8b. Voz (TTS + STT) — añadido 2026-05-17

### STT (input por voz) — gratis, navegador
- Componente: [`VoiceRecorder`](src/components/ui/voice-recorder.tsx)
- API: Web Speech API nativa (`window.SpeechRecognition`)
- Idioma: dinámico desde `useLocale()` mapeado a BCP-47 (es-ES, en-US, pt-PT, fr-FR)
- **Sin coste** — todo el procesamiento ocurre en el navegador
- Limitación: **Firefox no soporta** STT nativo. El botón se muestra deshabilitado con tooltip.
- Permisos: el navegador pide permiso de micrófono la primera vez. Si lo deniega, el botón cambia a estado "denegado" con tooltip de cómo activarlo.

### TTS (voz del mentor) — ElevenLabs con fallback nativo
- Componente: [`SpeakButton`](src/components/ui/speak-button.tsx)
- Prop `preferElevenLabs={true}` se pasa solo a respuestas del mentor (no a mensajes del usuario, no a crisis).
- Endpoint: [`/api/voice/tts`](src/app/api/voice/tts/route.ts)
- Provider: ElevenLabs (plan **Creator** $22/mes, 253k chars/mes)
- API key: `ELEVENLABS_API_KEY` en `/docker/luciernaga-ai-traefik/.env-vars` (NO en `.env`).
- Modelo: `eleven_multilingual_v2` (cubre los 4 idiomas con una sola voz)
- Voz default: **Sarah** (`EXAVITQu4vr4xnSDxMaL`) — premade, reassuring + mature. Cambiar en [`src/lib/elevenlabs/voices.ts`](src/lib/elevenlabs/voices.ts).
- Cache LRU server-side: 64MB en memoria. Mismas respuestas no consumen cuota. Se vacía en cada deploy.
- Rate limits: anónimos 25 TTS/h por IP, logged-in 100 TTS/h por userId.
- Tope por request: 1500 chars.
- **Fallback transparente**: si ElevenLabs falla (quota, red, timeout), `SpeakButton` cae al `speechSynthesis` nativo del navegador sin romper. Solo cambia la calidad de voz (HD → robótica del SO).
- **Crisis bypass automático**: las respuestas con `variant: "crisis"` no renderizan `SpeakButton` (early return preexistente).

### Quirk operativo — añadir un secret nuevo a luciernaga-ai
El compose lee `env_file: .env-vars`, NO `.env`. Añadir secrets al archivo equivocado falla silenciosamente. Procedimiento:
```bash
ssh root@72.61.195.108
echo "NUEVA_VAR=valor" >> /docker/luciernaga-ai-traefik/.env-vars
cd /docker/luciernaga-ai-traefik && docker compose up -d --force-recreate
# Verificar:
docker exec luciernaga-ai sh -c 'env | grep ^NUEVA_VAR='
```
**`--force-recreate` es obligatorio** — sin él compose ve misma imagen + config y no recrea, la env nueva no entra.

### Voces disponibles (cambiar default)
Premade (siempre disponibles, sin slot):
- `EXAVITQu4vr4xnSDxMaL` — Sarah (reassuring) ⭐ default
- `XB0fDUnXU5powFXDhCwa` — Charlotte (warm, conversational)
- `21m00Tcm4TlvDq8ikWAM` — Rachel (clásica, smooth)
- `cgSgspJ2msm6clMCkdW9` — Jessica (playful, bright)
- `nPczCjzI2devNBz1zQrb` — Brian (deep, comforting, masculina)

Voces del Voice Library (marketplace) requieren **"Add to my voices"** en el dashboard antes de funcionar — consume slot del límite 30 voces.

### Auditoría / monitoreo
- Quota: `curl -H "xi-api-key: $KEY" https://api.elevenlabs.io/v1/user | jq .subscription.character_count`
- Cache stats: importar `getCacheStats()` de `@/lib/elevenlabs/tts` (no expuesto via HTTP hoy)
- Logs: `tail -f /var/log/luciernaga-ai/*.log | grep VOICE` (si configurado) o `docker logs luciernaga-ai | grep VOICE`

---

## 9. Tooling i18n

- **Idiomas**: ES (fuente), EN, PT-PT (estricto), FR-FR (tutoiement).
- **Sync**: `pnpm i18n:sync` traduce keys nuevas de `es.json` a `en/pt/fr.json` con OpenRouter Haiku. Requiere `OPENROUTER_API_KEY` con saldo (~$0.02/run típico). Si OpenRouter responde HTTP 402, el saldo está agotado.
- **Audit**: `pnpm i18n:audit [--path=src/app/X | --path=src/components/foo.tsx]` detecta strings ES hardcoded sin `useTranslations`.
- **Check (key parity)**: `pnpm i18n:check` falla si `es.json` y `en/pt/fr.json` divergen. Hard fail en CI desde 2026-05-17.
- **Check (unused)**: `pnpm i18n:check:unused` detecta keys en `es.json` no referenciadas en `src/` (heurística regex + patrones dinámicos).

CI job `i18n-key-parity` en [ci.yml](.github/workflows/ci.yml). Si rojo: recargar OpenRouter, `pnpm i18n:sync`, commit.

---

## 10. Runbook — si X cae

### "La web no carga"
1. `curl -I https://tresmilmillonesdelatidos.es` — ¿HTTP 200?
2. Si timeout/503: `ssh root@72.61.195.108 'docker ps --filter name=luciernaga-ai'`
3. Si container caído: `docker logs --tail 100 luciernaga-ai`
4. Restart: `cd /docker/luciernaga-ai-traefik/ && docker compose up -d`
5. Si build no arrancó: ver "Deploy manual de emergencia" (sección 3).

### "GH Actions no despliega"
1. `gh run list --workflow=vps-direct-deploy.yml --limit 5` — ¿runs recientes verdes?
2. Si rojo: `gh run view <RUN_ID>` para ver el error.
3. Causa frecuente: `VPS_SSH_KEY` rotada. Regenerar clave en Mac, pegar pública en VPS `/root/.ssh/authorized_keys`, privada en GH secrets.

### "mentor-db corrupta / OOM (precedente: merch-db 2026-05-16)"
1. Backup más reciente en Telegram del bot. Bajar `.sql.gz`.
2. `ssh root@72.61.195.108`
3. Parar container app: `docker stop luciernaga-ai`
4. Si Postgres no levanta por WAL corrupto: `docker exec mentor-db pg_resetwal -f /var/lib/postgresql/data` (¡pérdida potencial de últimos commits no checkpoint!).
5. Restaurar: `gunzip < mentor-20XX.sql.gz | docker exec -i mentor-db psql -U mentor -d mentor_web`
6. Levantar app: `docker compose up -d`

### "Crons no se ejecutan"
1. `ssh root@72.61.195.108 'tail -50 /var/log/mentor-crons.log'`
2. ¿Hay líneas recientes? Si no, `crontab -l` y verifica que están.
3. Test puntual: `curl -H "x-cron-secret: $(docker exec luciernaga-ai sh -c 'echo $CRON_SECRET')" https://tresmilmillonesdelatidos.es/api/cron/reminders`

### "OpenRouter sin saldo (HTTP 402)"
- Síntoma: `pnpm i18n:sync` falla, mentor IA no responde, traductor blog no funciona.
- Recargar en https://openrouter.ai/settings/credits.
- Tras recargar, sync pendiente: ver sección 9.

---

## 11. Mantenimiento periódico

| Frecuencia | Tarea | Comando |
|---|---|---|
| Diario | Verificar que `mentor-` backup llegó a Telegram | Mirar chat de @TRESMILMILLONESDELATIDOSBOT |
| Semanal | Revisar runs CI y deploy | `gh run list --limit 20` |
| Semanal | Revisar Coolify SQLite backups (otros proyectos) | `ls /root/backups/coolify-*` |
| Mensual | Auditar saldo OpenRouter | https://openrouter.ai/settings/credits |
| Mensual | `pnpm i18n:check:unused` para detectar keys legacy | Limpieza guiada |
| Trimestral | Rotar `VPS_SSH_KEY` y secrets sensibles | Regenerar + actualizar GH secrets |
| Trimestral | Probar restore de backup mentor-db en local | Verificar que el backup REALMENTE funciona |

---

## 12. Política — "no new shiny"

Antes de empezar un feature nuevo, verificar que esto esté verde:

- [ ] CI verde en main (incluye `i18n-key-parity`)
- [ ] Último deploy < 24h
- [ ] Sin alertas Telegram pendientes
- [ ] OpenRouter saldo > $5
- [ ] Backup mentor-db de ayer en Telegram

Si algo no está verde, **arreglar primero**. La memoria operativa documenta el patrón: [No al Big Rewrite](feedback memory) y [Espíritu crítico](feedback memory).

---

## 13. Contactos / accesos

- **Owner**: Mario Pablo Barron (mariopablobarron@gmail.com), CEO Startidea
- **Telegram**: chat ID `678888`
- **Hostinger**: hpanel.hostinger.com (login: mariopablobarron@gmail.com)
- **GitHub**: github.com/mariopablobarron
- **Google Cloud**: project `trusty-drive-495404-q9`, owner mariopablobarron@gmail.com
- **OpenRouter**: openrouter.ai (login propio)
- **Coolify panel**: http://72.61.195.108:3000 (login `mario@startidea.es`)

---

_Última revisión: 2026-05-17_
