#!/bin/bash
set -euo pipefail

echo "=== Deploy Tres Mil Millones de Latidos ==="

# Validate required env vars
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

# 1. Install dependencies
echo "--- Installing dependencies ---"
npm ci --prefer-offline --no-audit

# 2. Generate Prisma Client
echo "--- Generating Prisma Client ---"
npx prisma generate

# 3. Apply pending migrations
echo "--- Running migrations ---"
npx prisma migrate deploy

# 4. Build
echo "--- Building ---"
npm run build

# 5. Start
echo "--- Starting server ---"
npm start
