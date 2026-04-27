#!/usr/bin/env bash
set -euo pipefail

# Daily PostgreSQL backup script.
# Requirements:
# - DATABASE_URL must be set
# - pg_dump and gzip must be available

BACKUP_DIR="${BACKUP_DIR:-./backups/db}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DB_URL="${DATABASE_URL:-}"

if [[ -z "$DB_URL" ]]; then
  echo "[backup] DATABASE_URL is not set"
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[backup] pg_dump is required but was not found"
  exit 1
fi

if ! command -v gzip >/dev/null 2>&1; then
  echo "[backup] gzip is required but was not found"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +"%Y-%m-%d_%H%M%S")"
BACKUP_FILE="$BACKUP_DIR/luciernaga_${TIMESTAMP}.sql.gz"
TMP_FILE="$BACKUP_FILE.tmp"

# Generate a consistent custom dump and compress it.
pg_dump --no-owner --no-privileges --format=plain "$DB_URL" | gzip -9 >"$TMP_FILE"
mv "$TMP_FILE" "$BACKUP_FILE"

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$BACKUP_FILE" >"$BACKUP_FILE.sha256"
fi

if [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$BACKUP_RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
  find "$BACKUP_DIR" -type f -name "*.sql.gz.sha256" -mtime +"$BACKUP_RETENTION_DAYS" -delete
fi

LATEST_LINK="$BACKUP_DIR/latest.sql.gz"
ln -sfn "$(basename "$BACKUP_FILE")" "$LATEST_LINK"

echo "[backup] Backup created: $BACKUP_FILE"
echo "[backup] Latest link: $LATEST_LINK"
