#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

check_endpoint() {
  local name="$1"
  local method="$2"
  local path="$3"
  local body="${4:-}"

  local raw
  if [[ -n "$body" ]]; then
    raw="$(curl -sS -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -d "$body" -w "\n%{http_code}")"
  else
    raw="$(curl -sS -X "$method" "$BASE_URL$path" -w "\n%{http_code}")"
  fi

  local status
  status="$(printf "%s" "$raw" | tail -n1)"
  local payload
  payload="$(printf "%s" "$raw" | sed '$d')"

  echo "[$name] status=$status payload=$payload"

  if [[ "$status" -ge 400 ]]; then
    echo "[ERROR] ${name} falló"
    return 1
  fi

  return 0
}

echo "== system check =="

check_endpoint "health" "GET" "/api/health"

CHAT_PAYLOAD='{"message":"Estoy bloqueado y con ansiedad por decidir","userId":"system-check"}'
CHAT_RAW="$(curl -sS -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" -d "$CHAT_PAYLOAD" -w "\n%{http_code}")"
CHAT_STATUS="$(printf "%s" "$CHAT_RAW" | tail -n1)"
CHAT_BODY="$(printf "%s" "$CHAT_RAW" | sed '$d')"

echo "[chat] status=$CHAT_STATUS payload=$CHAT_BODY"

if [[ "$CHAT_STATUS" -ge 400 ]]; then
  echo "[ERROR] chat endpoint falló"
  exit 1
fi

if ! grep -q '"response"' <<<"$CHAT_BODY"; then
  echo "[ERROR] chat endpoint no devolvió response"
  exit 1
fi

if ! grep -q '"state"' <<<"$CHAT_BODY"; then
  echo "[ERROR] chat endpoint no devolvió state"
  exit 1
fi

echo "[AI] respuesta válida detectada"
echo "OK"
