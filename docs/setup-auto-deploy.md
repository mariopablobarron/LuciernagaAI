# Auto-deploy VPS — setup inicial

Workflow GitHub Actions que dispara deploy automático al VPS en cada push a `main`. Reemplaza el flujo manual "abrir Web Console + pegar comando" que veníamos haciendo.

## Una vez configurado

```
git push origin main → GH Actions → SSH al VPS → docker build → docker compose up
```

3-10 minutos según el cambio. Sin tocar nada manualmente.

## Setup (15 minutos, una sola vez)

### 1. Generar SSH keypair en tu Mac

```bash
ssh-keygen -t ed25519 -f ~/.ssh/vps_deploy_luciernaga -N "" -C "github-actions-deploy"
```

Esto crea dos archivos:
- `~/.ssh/vps_deploy_luciernaga` (privada — SECRET)
- `~/.ssh/vps_deploy_luciernaga.pub` (pública — al VPS)

### 2. Pegar la PÚBLICA en el VPS

Copia la pública:

```bash
cat ~/.ssh/vps_deploy_luciernaga.pub
```

Abre **Web Console de Hostinger** (hpanel.hostinger.com → tu VPS → Browser terminal) y pega:

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo "PEGA-AQUI-LA-PUBLICA-COMPLETA" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

(Reemplaza `PEGA-AQUI-LA-PUBLICA-COMPLETA` con la línea entera que sale de `cat ...pub`.)

Verifica que SSH funciona desde tu Mac:

```bash
ssh -i ~/.ssh/vps_deploy_luciernaga root@72.61.195.108 "echo OK"
# Debe responder: OK
```

### 3. Pegar la PRIVADA como secret en GitHub

Copia la privada (incluye las líneas `BEGIN`/`END`):

```bash
cat ~/.ssh/vps_deploy_luciernaga
```

En GitHub:
1. Ve a https://github.com/mariopablobarron/LuciernagaAI/settings/secrets/actions
2. Click **New repository secret**.
3. Name: `VPS_SSH_KEY`
4. Value: pega TODO el contenido de la privada.
5. **Add secret**.

### 4. (Opcional) Notificación Telegram

Si quieres que te avise por Telegram tras cada deploy, añade dos secrets más:
- `TELEGRAM_BOT_TOKEN` (el token de tu bot)
- `ADMIN_TELEGRAM_ID` (tu chat ID)

Sin esos secrets, el workflow corre igual pero sin notificar.

### 5. Probar

Lanza el workflow manualmente sin esperar a un push:

1. https://github.com/mariopablobarron/LuciernagaAI/actions
2. Click en **VPS Direct Deploy (luciernaga-ai)** en el sidebar.
3. **Run workflow** → branch `main` → **Run workflow**.

A los 6-12 minutos verás verde si todo OK. Click en el job para ver logs paso a paso.

## A partir de ese momento

Cada `git push origin main` dispara automáticamente:
- Build de imagen Docker en el VPS.
- Reemplazo del contenedor activo (downtime ~5 segundos).
- Health check post-deploy (espera HTTP 200 hasta 60s).
- Notificación Telegram si fallar/éxito.

El workflow **ignora** pushes que solo tocan:
- `docs/**`
- `*.md` raíz
- workflows de auto-update de docs

(No tiene sentido reconstruir la app por un cambio de README.)

## Mantenimiento

### Rotar la SSH key

Si la key se compromete:

1. En el VPS: `nano /root/.ssh/authorized_keys` → borra la línea con `github-actions-deploy`.
2. Genera una nueva (paso 1).
3. Pega la pública nueva (paso 2).
4. Actualiza el secret `VPS_SSH_KEY` en GitHub (paso 3).

### Revocar acceso temporalmente

GitHub → Repo Settings → Secrets → `VPS_SSH_KEY` → **Remove**. El workflow fallará en el primer step (validación de secret presente).

### Deploy roto, qué hacer

Si un deploy deja la app en mal estado:

1. Web Console de Hostinger.
2. Volver al tag anterior:
   ```bash
   cd /docker/luciernaga-ai-traefik
   docker images | grep cmnc4qjph0006p2a3ggmfdflz | head -5
   sed -i "s|image: cmnc4qjph0006p2a3ggmfdflz:.*|image: cmnc4qjph0006p2a3ggmfdflz:<TAG-ANTERIOR>|" docker-compose.yml
   docker compose up -d
   ```

## Tiempo de cada deploy

| Etapa | Duración típica |
|-------|-----------------|
| Sync repo | 5-10s |
| `docker build` (Next.js + Prisma) | 5-9 min |
| `docker compose up -d` | 5-15s |
| Health check | 5-30s |
| **Total end-to-end** | **6-10 min** |

## Por qué este workflow y no Coolify

La app `luciernaga-ai` se sacó de gestión Coolify durante el incidente del 2026-04-30 porque Coolify v3 no le aplicaba labels Traefik tras el snapshot restore. Vive en `/docker/luciernaga-ai-traefik/docker-compose.yml`. Por eso el webhook del workflow `coolify-auto-deploy.yml` ya no recrea su contenedor.

Cuando/si la app vuelva a Coolify gestión, este workflow se puede archivar.
