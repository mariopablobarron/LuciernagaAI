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
2. GH Actions workflow [`vps-direct-deploy.yml`](.github/workflows/vps-direct-deploy.yml):
   - SSH al VPS con `secrets.VPS_SSH_KEY`
   - `git pull` en `/tmp/build-luciernaga`
   - `docker build -t luciernaga-ai:<short-sha>`
   - `sed` para apuntar el compose al nuevo tag
   - `docker compose up -d` en `/docker/luciernaga-ai-traefik/`
   - Health check contra `/api/health` (6 reintentos, ~60s)
   - Notifica Telegram al ADMIN_TELEGRAM_ID
3. Tiempo total: ~4-5 minutos.

`paths-ignore` evita redeploy en `docs/**`, `*.md`, workflows de dev-journal/hardening-board/user-manual-pdf.

### Workflow legacy
[`coolify-auto-deploy.yml`](.github/workflows/coolify-auto-deploy.yml) intenta notificar a Coolify como segunda vía. Sin secret `COOLIFY_DEPLOY_WEBHOOK_URL` es no-op (no falla). La app no está bajo gestión Coolify desde 2026-04-30 — borrar el workflow si quieres limpieza.

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
| Runtime container | `docker exec luciernaga-ai env` | Inyectados desde el compose en `/docker/luciernaga-ai-traefik/.env` |
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
**No usado** (migrado a crontab VPS el 2026-05-17). Si la memoria operativa dice lo contrario, está desactualizada.

---

## 6. Backups

### mentor-db (Postgres principal)
- Script: `/root/scripts/mentor-db-backup.sh` (existente desde 2026-04-26)
- Cron: `/etc/cron.d/mentor-db-backup` → `30 3 * * *` (diario 03:30 UTC)
- Output: `/root/backups/mentor-YYYYMMDD-HHMM.sql.gz`
- Retención: 7 archivos (último ~semana)
- Log: `/var/log/mentor-db-backup.log`
- Alerta Telegram **solo en fallos** (no sube el `.sql.gz` completo). Tokens en `/root/scripts/backup.env` (modo 600, creado 2026-05-17).
- **Test manual**: `ssh root@72.61.195.108 /root/scripts/mentor-db-backup.sh`
- **Recovery**: `gunzip < mentor-XXX.sql.gz | docker exec -i mentor-db psql -U mentor -d mentor_web`
- **Mejora opcional**: subir el `.sql.gz` a Telegram cada día (el de merch sí lo hace, ver `/root/backup-merch.sh`). Ventaja: backup off-site accesible desde móvil. Trade-off: 1.8MB/día en el chat (~50MB/mes).

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
