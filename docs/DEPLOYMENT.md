# Tres Mil Millones de Latidos - Deployment Guide

## 🚀 Despliegue a Producción

### Requisitos Previos
- Node.js 22+
- npm 10+
- Base de datos PostgreSQL
- Variables de entorno configuradas

### Variables de Entorno Requeridas

Crear un archivo `.env.local` (local) o configurar en la plataforma de hosting:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/luciernaga

# Authentication
AUTH_TOKEN_SECRET=your-secret-key-min-32-chars

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password

# APIs Externas
NEXT_PUBLIC_BUILDER_API_KEY=your-builder-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# App URLs
APP_BASE_URL=https://tresmilmillonesdelatidos.es
NEXT_PUBLIC_APP_URL=https://tresmilmillonesdelatidos.es
```

### Opción 1: Despliegue en Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Hacer login
vercel login

# 3. Desplegar
vercel deploy --prod

# 4. Configurar variables en el panel de Vercel
# Ir a Settings → Environment Variables
# Agregar todas las variables de .env.local
```

### Opción 2: Despliegue en Coolify (Self-Hosted)

```bash
# 1. Conectar repositorio Git a Coolify
# En el panel: Projects → New Project → Connect Git

# 2. Configurar:
# - Build command: npm run build
# - Start command: npm run start
# - Node version: 22

# 3. Agregar variables de entorno en Coolify UI

# 4. Deploy automático en cada push a main
```

### Opción 3: Despliegue Tradicional (Docker)

```bash
# 1. Build de Docker
docker build -t luciernaga:latest .

# 2. Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXT_PUBLIC_BUILDER_API_KEY="..." \
  luciernaga:latest

# 3. Configurar reverse proxy (Nginx)
```

### Guía Paso a Paso - Vercel

1. **Crear cuenta en Vercel**
   - Ir a https://vercel.com/signup
   - Conectar cuenta de GitHub

2. **Importar proyecto**
   - Clic en "New Project"
   - Seleccionar repositorio `Tres Mil Millones de LatidosAI`
   - Vercel detectará Next.js automáticamente

3. **Configurar variables**
   - Settings → Environment Variables
   - Agregar cada variable de `.env.local`
   - Aplicar a Production

4. **Deploy**
   - Vercel desplegará automáticamente
   - URL: `https://luciernaga.vercel.app` (o dominio personalizado)

5. **Dominio personalizado** (opcional)
   - Settings → Domains
   - Agregar `tresmilmillonesdelatidos.es`
   - Apuntar DNS a Vercel nameservers

### Checklist Pre-Deploy

- [ ] Todas las variables de entorno configuradas
- [ ] Base de datos PostgreSQL lista
- [ ] `npm run build` ejecuta sin errores
- [ ] Tests pasando: `npm test`
- [ ] No hay warnings críticos en console
- [ ] `.env.local` NO está en git
- [ ] Permisos correctos en base de datos
- [ ] Builder.io API key válida
- [ ] OpenRouter API key válida
- [ ] SMTP/Email service configurado (si es necesario)

### Comandos Útiles

```bash
# Build local
npm run build

# Start producción local
npm run start

# Verificar tipos
npx tsc --noEmit

# Linting
npm run lint

# Format código
npm run format
```

### Monitoreo Post-Deploy

1. **Health check**
   ```bash
   curl https://tresmilmillonesdelatidos.es/api/health
   ```

2. **Ver logs**
   - Vercel: Dashboard → Deployments → Logs
   - Coolify: Panel → Logs
   - Local: `docker logs <container-id>`

3. **Base de datos**
   ```bash
   # Conectar a PostgreSQL
   psql postgresql://user:password@host:5432/luciernaga
   
   # Ver conexiones activas
   SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
   ```

### Troubleshooting

**Error: Cannot find module**
- Ejecutar: `npm install`
- Clear cache: `npm cache clean --force`

**Error: Database connection failed**
- Verificar `DATABASE_URL`
- Confirmar IP whitelisting en PostgreSQL
- Probar conexión: `psql $DATABASE_URL`

**Error: Build fails**
- Revisar: `npm run build` localmente
- Verificar: `npx tsc --noEmit`
- Limpiar: `rm -rf .next && npm run build`

**App lenta**
- Verificar logs de API
- Monitorear uso de memoria: `node --max-old-space-size=4096`
- Optimizar queries de base de datos

### Escalar Verticalmente

1. **Aumentar recursos**
   - CPU: De 1x a 2x o 4x
   - Memoria: De 1GB a 2GB o 4GB
   - Database: Aumentar capacidad

2. **CDN para assets**
   - Cloudflare (gratis)
   - AWS CloudFront
   - Vercel Edge Network (incluido)

3. **Caché**
   - Redis para sesiones
   - Memcached para queries
   - HTTP Cache headers

### Backups y Recuperación

```bash
# Backup base de datos
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql

# Backup S3
aws s3 cp backup.sql s3://bucket/backups/$(date +%Y%m%d).sql
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Support

- **Documentación:** https://nextjs.org/docs
- **Vercel:** https://vercel.com/docs
- **PostgreSQL:** https://www.postgresql.org/docs
- **Issues:** GitHub Issues en el repositorio
