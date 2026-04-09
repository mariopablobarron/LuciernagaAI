# ============================================
# STAGE 1: BUILD
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY next-env.d.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./
COPY prisma.config.ts ./

# Install dependencies (including devDependencies for build)
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY prisma ./prisma
COPY src ./src
COPY public ./public

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# STAGE 2: RUNTIME
# ============================================
FROM node:20-slim

WORKDIR /app

# Install dumb-init for correct signal handling
RUN apt-get update && apt-get install -y --no-install-recommends \
  dumb-init \
  curl \
  openssl \
  postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY next.config.ts ./
COPY prisma.config.ts ./

# Install ONLY production dependencies
RUN npm ci --omit=dev --prefer-offline --no-audit

# Copy Prisma schema + migrations and generate client for Linux
COPY prisma ./prisma
RUN npx prisma generate

# Copy seed script for initial superadmin creation
COPY scripts/seed-superadmin.mjs ./scripts/seed-superadmin.mjs

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Production env
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle graceful shutdown
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Apply pending migrations, seed superadmin, then start server
# Migration failure is non-blocking so the app starts even if DB is temporarily unavailable
CMD ["sh", "-c", "npx prisma migrate deploy || echo '[WARN] Migration failed, starting anyway...'; node scripts/seed-superadmin.mjs || echo '[WARN] Superadmin seed skipped'; exec npm start"]
