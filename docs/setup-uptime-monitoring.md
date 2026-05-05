# Uptime monitoring con UptimeRobot

Hoy si la web cae, te enteras tarde — los crons internos (`cron-watchdog`) no detectan caídas porque viven dentro del mismo contenedor que cae. UptimeRobot es la red de seguridad externa: pinga desde fuera, te avisa por email/Telegram en 5 minutos máximo.

**Coste:** gratis hasta 50 monitors, intervalo mínimo 5 min. Suficiente para este proyecto.

## 5 minutos de setup

### 1. Crear cuenta

https://uptimerobot.com → **Sign up free** → email + password.

(Recomendación: usa el mismo email que ya usas para alertas del proyecto, así llega a un solo sitio.)

### 2. Añadir 3 monitors

En el dashboard → **Add New Monitor**.

| # | Type | Friendly name | URL | Interval | Por qué |
|---|------|---------------|-----|----------|---------|
| 1 | HTTP(s) | `mentor-web · home` | `https://tresmilmillonesdelatidos.es/` | 5 min | Detecta caída a nivel Traefik (404/500/timeout). Lo más visible para el usuario. |
| 2 | HTTP(s) — Keyword | `mentor-web · health` | `https://tresmilmillonesdelatidos.es/api/health` | 5 min | Verifica DB + migraciones via `keyword exists: "ok"`. Detecta degradación interna sin caída visible. |
| 3 | HTTP(s) | `mentor-web · ready` | `https://tresmilmillonesdelatidos.es/api/ready` | 5 min | Endpoint ultra-ligero (~180ms). Detecta el momento exacto de cold-start vs disponibilidad. |

**Para el monitor #2 (keyword):**
- Type: `HTTPS Keyword`
- Keyword Type: `Keyword Exists`
- Keyword Value: `"status":"ok"`

Eso garantiza que si la respuesta es JSON pero `status: "degraded"`, te avisa.

### 3. Añadir alertas

Settings → **Alert Contacts** → **Add Alert Contact**.

Mínimo:
- **Email** (el tuyo).

Opcional pero recomendado:
- **Telegram** (paso 4).

Después en cada monitor: edit → marca el alert contact que quieres que avise.

### 4. (Opcional) Alertas Telegram

UptimeRobot tiene integración Telegram nativa:

1. Telegram → busca `@UptimeRobotBot` → start.
2. UptimeRobot dashboard → **My Settings** → **Alert Contacts** → **Add** → **Telegram**.
3. Sigue las instrucciones (te dará un código que pegas al bot).
4. Asocia ese contacto a los 3 monitors.

A partir de ahí, cuando uno caiga, te llega:

```
Monitor is DOWN: mentor-web · home (https://...)
Reason: HTTP 503 - Service Unavailable
```

### 5. (Opcional) Status page pública

UptimeRobot incluye una **status page pública** gratis. Útil si Mario quiere transparencia con usuarios cuando hay incidentes.

- **Status Pages** → **Add Status Page** → elige los 3 monitors → publica.
- URL: `https://stats.uptimerobot.com/<tu-id>` (puedes apuntar tu propio dominio si quieres, ej. `status.tresmilmillonesdelatidos.es`).

## Lo que NO te avisa UptimeRobot

UptimeRobot solo verifica HTTP. No ve:
- DB caída pero app responde con cache.
- Crons que dejan de ejecutarse (los detecta el `cron-watchdog` interno).
- Errores en Sentry / Logtail.
- Coste LLM disparado.

Por eso vale la pena combinar:
- **UptimeRobot** = ¿está la web viva?
- **Sentry** = ¿hay errores? (ya configurado, sin PII desde commit `e187ed8`).
- **`cron-watchdog`** = ¿los crons funcionan? (ya configurado).
- **`/api/admin/usage-snapshot`** = ¿hay actividad real? (consulta manual).

## Si quieres ir un paso más

Cuando lleves 1-2 meses con UptimeRobot, mira el SLA real (UptimeRobot lo calcula solo). Si baja del 99.5% mensual, conviene considerar:

- **Otro VPS / región** (Hostinger en otra DC, redundancia geográfica).
- **CDN delante** (Cloudflare gratis ya hace cache + DDoS protection).
- **Health check más fino** (uptime sólo dice "responde", no "responde rápido").

Para este proyecto / etapa, con UptimeRobot básico sobra.
