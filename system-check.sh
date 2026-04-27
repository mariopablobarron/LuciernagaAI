#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILURES=0
WARNINGS=0
COOKIE_JAR="$(mktemp "${TMPDIR:-/tmp}/luciernaga-system-check.XXXXXX")"
trap 'rm -f "$COOKIE_JAR"' EXIT

print_section() {
  echo ""
  echo "=== $1 ==="
}

pass() {
  echo "PASS: $1"
}

warn() {
  echo "WARN: $1"
  WARNINGS=$((WARNINGS + 1))
}

fail() {
  echo "FAIL: $1"
  FAILURES=$((FAILURES + 1))
}

request_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -w $'\n%{http_code}'
  else
    curl -sS -X "$method" "$url" \
      -w $'\n%{http_code}'
  fi
}

request_json_with_cookie() {
  local method="$1"
  local url="$2"
  local body="${3:-}"

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -b "$COOKIE_JAR" \
      -c "$COOKIE_JAR" \
      -d "$body" \
      -w $'\n%{http_code}'
  else
    curl -sS -X "$method" "$url" \
      -b "$COOKIE_JAR" \
      -c "$COOKIE_JAR" \
      -w $'\n%{http_code}'
  fi
}

parse_http_code() {
  tail -n 1
}

parse_json_body() {
  sed '$d'
}

print_section "health"
health_raw="$(request_json "GET" "${BASE_URL}/api/health")" || {
  fail "No se pudo conectar a ${BASE_URL}/api/health"
  health_raw=""
}

if [[ -n "$health_raw" ]]; then
  health_code="$(printf "%s" "$health_raw" | parse_http_code)"
  health_body="$(printf "%s" "$health_raw" | parse_json_body)"
  if [[ "$health_code" == "200" ]] && grep -Eq '"status"\s*:\s*"ok"' <<<"$health_body"; then
    pass "Health endpoint operativo"
  else
    fail "Health endpoint no saludable (http=${health_code})"
  fi
fi

print_section "auth"
auth_raw="$(request_json_with_cookie "POST" "${BASE_URL}/api/auth/token")" || {
  fail "No se pudo conectar a ${BASE_URL}/api/auth/token"
  auth_raw=""
}

if [[ -n "$auth_raw" ]]; then
  auth_code="$(printf "%s" "$auth_raw" | parse_http_code)"
  auth_body="$(printf "%s" "$auth_raw" | parse_json_body)"
  if [[ "$auth_code" == "200" ]] && grep -Eq '"success"\s*:\s*true' <<<"$auth_body"; then
    pass "Auth token operativo"
  else
    fail "Auth token falló (http=${auth_code})"
  fi
fi

print_section "chat"
chat_payload='{"message":"Estoy bloqueado y no sé por dónde empezar","userId":"system-check-chat"}'
chat_raw="$(request_json "POST" "${BASE_URL}/api/mock-chat" "$chat_payload")" || {
  fail "No se pudo conectar a ${BASE_URL}/api/mock-chat"
  chat_raw=""
}

if [[ -n "$chat_raw" ]]; then
  chat_code="$(printf "%s" "$chat_raw" | parse_http_code)"
  chat_body="$(printf "%s" "$chat_raw" | parse_json_body)"
  if [[ "$chat_code" == "200" ]] && grep -Eq '"ok"\s*:\s*true' <<<"$chat_body"; then
    pass "Mock chat responde correctamente"
  else
    fail "Mock chat falló (http=${chat_code})"
  fi
fi

print_section "DB"
db_payload='{"response":"Hoy estoy bloqueado pero quiero avanzar"}'
db_raw="$(request_json_with_cookie "POST" "${BASE_URL}/api/checkin" "$db_payload")" || {
  fail "No se pudo conectar a ${BASE_URL}/api/checkin"
  db_raw=""
}

if [[ -n "$db_raw" ]]; then
  db_code="$(printf "%s" "$db_raw" | parse_http_code)"
  db_body="$(printf "%s" "$db_raw" | parse_json_body)"
  if [[ "$db_code" == "200" ]] && grep -Eq '"ok"\s*:\s*true' <<<"$db_body"; then
    pass "DB operativa para check-in"
  else
    fail "DB check falló (http=${db_code})"
  fi
fi

print_section "IA"
ia_payload='{"message":"Tengo ansiedad y miedo de decidir mal"}'
ia_raw="$(request_json_with_cookie "POST" "${BASE_URL}/api/chat-direct" "$ia_payload")" || {
  fail "No se pudo conectar a ${BASE_URL}/api/chat-direct"
  ia_raw=""
}

if [[ -n "$ia_raw" ]]; then
  ia_code="$(printf "%s" "$ia_raw" | parse_http_code)"
  ia_body="$(printf "%s" "$ia_raw" | parse_json_body)"
  if [[ "$ia_code" != "200" ]]; then
    fail "IA endpoint falló (http=${ia_code})"
  elif grep -Eq '"fallback"\s*:\s*false' <<<"$ia_body"; then
    pass "IA responde con OpenRouter"
  elif grep -Eq '"fallback"\s*:\s*true' <<<"$ia_body"; then
    warn "IA en modo fallback (OpenRouter degradado)"
  else
    fail "IA respondió sin bandera de fallback esperada"
  fi
fi

print_section "CONVERSATIONS"
conversations_raw="$(request_json_with_cookie "GET" "${BASE_URL}/api/conversations")" || {
  fail "No se pudo conectar a ${BASE_URL}/api/conversations"
  conversations_raw=""
}

if [[ -n "$conversations_raw" ]]; then
  conversations_code="$(printf "%s" "$conversations_raw" | parse_http_code)"
  conversations_body="$(printf "%s" "$conversations_raw" | parse_json_body)"
  if [[ "$conversations_code" == "200" ]] && grep -Eq '"success"\s*:\s*true' <<<"$conversations_body"; then
    pass "Conversations endpoint operativo"
  else
    fail "Conversations endpoint falló (http=${conversations_code})"
  fi
fi

print_section "ADMIN INSIGHTS"
admin_raw="$(request_json "GET" "${BASE_URL}/api/admin/insights")" || {
  fail "No se pudo conectar a ${BASE_URL}/api/admin/insights"
  admin_raw=""
}

if [[ -n "$admin_raw" ]]; then
  admin_code="$(printf "%s" "$admin_raw" | parse_http_code)"
  admin_body="$(printf "%s" "$admin_raw" | parse_json_body)"
  if [[ "$admin_code" == "200" ]] && grep -Eq '"metrics"\s*:' <<<"$admin_body"; then
    pass "Admin insights operativo (auth activa)"
  elif [[ "$admin_code" == "401" ]]; then
    pass "Admin insights protegido correctamente (http=401 sin auth)"
  else
    fail "Admin insights falló (http=${admin_code})"
  fi
fi

echo ""
if [[ "$FAILURES" -gt 0 ]]; then
  echo "Resultado: ${FAILURES} fallo(s), ${WARNINGS} advertencia(s)"
  exit 1
fi

echo "Resultado: OK (${WARNINGS} advertencia(s))"
