# ============================================
# STAGE 1: BUILD
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY next-env.d.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./
COPY prisma.config.ts ./

# Install dependencies (including devDependencies for build)
RUN npm ci --prefer-offline --no-audit

# Copiar source code
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

# Install dumb-init para manejo correcto de signals
RUN apt-get update && apt-get install -y --no-install-recommends \
  dumb-init \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY next.config.ts ./

# Install ONLY production dependencies
RUN npm ci --omit=dev --prefer-offline --no-audit

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY prisma ./prisma

# Copy NODE_ENV
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle graceful shutdown
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Apply pending migrations (non-blocking) then start Next.js server
CMD ["sh", "-c", "echo '--- PRISMA MIGRATE ---' && npx prisma migrate deploy 2>&1 || echo '⚠ Migration failed, starting anyway...' && echo '--- STARTING SERVER ---' && npm start"]
