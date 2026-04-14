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

# Copy full source for Claude Code (read/edit files inside container)
COPY src ./src
COPY docs ./docs
COPY .git ./.git
COPY CLAUDE.md AGENTS.md ./
COPY tsconfig.json next-env.d.ts postcss.config.mjs eslint.config.mjs ./

# Configure git for Claude Code commits
RUN git config --global user.name "Claude Code" && \
    git config --global user.email "claude@tresmilmillonesdelatidos.es" && \
    git config --global --add safe.directory /app

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

# Apply pending migrations, seed superadmin, then start server.
# Migration failure is FATAL: a container running against an out-of-date
# schema fails silently at runtime (see post-mortem 2026-04-14 where a
# missing latidos/CommunityReport migration tumbled the chat for 3 days).
# Seed failure stays non-fatal — the seed is idempotent convenience, not
# a correctness invariant.
CMD ["sh", "-c", "npx prisma migrate deploy || { echo '[FATAL] Migration failed — refusing to start'; exit 1; }; node scripts/seed-superadmin.mjs || echo '[WARN] Superadmin seed skipped'; exec npm start"]
