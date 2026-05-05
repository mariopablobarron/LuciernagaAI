# ============================================
# STAGE 1: BUILD
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files + Prisma schema BEFORE npm ci.
# Razón: package.json tiene postinstall = "prisma generate", que necesita
# /app/prisma/schema.prisma presente en el momento del install.
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY next-env.d.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install dependencies (including devDependencies for build)
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY src ./src
COPY public ./public
# messages/ contiene los JSON de i18n (es.json, en.json) que src/i18n/request.ts
# importa dinámicamente con `import("../../messages/${locale}.json")`. Sin
# este COPY, Turbopack falla con "Module not found" en build.
COPY messages ./messages

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# STAGE 2: RUNTIME
# ============================================
FROM node:20-slim

WORKDIR /app

# Install system tools + git (needed for Claude Code)
RUN apt-get update && apt-get install -y --no-install-recommends \
  dumb-init \
  curl \
  openssl \
  postgresql-client \
  git \
  && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code || echo '[WARN] Claude Code install skipped'

# Copy package files + Prisma schema BEFORE npm ci.
# package.json tiene postinstall = "prisma generate", que necesita
# /app/prisma/schema.prisma presente. Si copiamos prisma DESPUÉS, npm ci
# falla con "Could not load schema". Por eso este orden.
COPY package*.json ./
COPY next.config.ts ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install ONLY production dependencies (postinstall regenerará el client
# de Prisma para Linux con el schema ya disponible).
RUN npm ci --omit=dev --prefer-offline --no-audit

# Copy seed script for initial superadmin creation
COPY scripts/seed-superadmin.mjs ./scripts/seed-superadmin.mjs

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy source for runtime (Next.js standalone necesita src para SSR de
# rutas dinámicas y los .ts del API).
COPY src ./src
COPY docs ./docs
# messages/ — JSON de i18n cargados en runtime por algunas rutas
# (src/app/api/admin/marketing/team/route.ts y similares).
COPY messages ./messages
COPY tsconfig.json next-env.d.ts postcss.config.mjs eslint.config.mjs ./

# Nota: .git, CLAUDE.md y AGENTS.md están en .dockerignore (meta-archivos
# que AI tools usan en local). Si en el futuro quieres operar Claude Code
# dentro del contenedor, hay que quitarlos del .dockerignore primero —
# y también añadir aquí los `git config` que vivían antes de este punto.

# Production env
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle graceful shutdown.
# Path correcto en debian/ubuntu base node:20-slim: /usr/bin/dumb-init
# (NO /usr/sbin/ — el binario se instala en /usr/bin/).
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Apply pending migrations, seed superadmin, then start server.
# Migration failure is FATAL: a container running against an out-of-date
# schema fails silently at runtime (see post-mortem 2026-04-14 where a
# missing latidos/CommunityReport migration tumbled the chat for 3 days).
# Seed failure stays non-fatal — the seed is idempotent convenience, not
# a correctness invariant.
CMD ["sh", "-c", "npx prisma migrate deploy || { echo '[FATAL] Migration failed — refusing to start'; exit 1; }; node scripts/seed-superadmin.mjs || echo '[WARN] Superadmin seed skipped'; exec npm start"]
