#!/usr/bin/env bash
set -euo pipefail

# Uso:
# BASE_URL="https://tu-dominio.com" EMAIL_TEST="tu+quiz@dominio.com" bash scripts/prod-smoke-quiz.sh
# o exporta variables antes de ejecutar.

BASE_URL="${BASE_URL:-}"
EMAIL_TEST="${EMAIL_TEST:-}"

if [[ -z "$BASE_URL" || -z "$EMAIL_TEST" ]]; then
  echo "ERROR: define BASE_URL y EMAIL_TEST"
  echo 'Ejemplo: BASE_URL="https://app.tudominio.com" EMAIL_TEST="tu+quiz@dominio.com" bash scripts/prod-smoke-quiz.sh'
  exit 1
fi

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

echo "== Smoke test PROD =="
echo "BASE_URL=$BASE_URL"
echo "EMAIL_TEST=$EMAIL_TEST"
echo

# 1) Health
health_json="$(curl -fsS "$BASE_URL/api/health")" || fail "/api/health no responde"
echo "$health_json" | jq . >/dev/null 2>&1 || fail "/api/health no devuelve JSON valido"
pass "/api/health responde"

# 2) Ready
ready_json="$(curl -fsS "$BASE_URL/api/ready")" || fail "/api/ready no responde"
echo "$ready_json" | jq . >/dev/null 2>&1 || fail "/api/ready no devuelve JSON valido"
pass "/api/ready responde"

# 3) Quiz result invalido (espera 400 + INVALID_STATE)
invalid_resp="$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/api/quiz/result" \
  -H "Content-Type: application/json" \
  -d '{"state":"invalido"}')"
invalid_body="$(echo "$invalid_resp" | head -n1)"
invalid_code="$(echo "$invalid_resp" | tail -n1)"
[[ "$invalid_code" == "400" ]] || fail "/api/quiz/result invalido debe dar 400, dio $invalid_code"
echo "$invalid_body" | jq -e '.error=="INVALID_STATE"' >/dev/null 2>&1 || fail "error esperado INVALID_STATE"
pass "/api/quiz/result valida estado invalido"

# 4) Quiz result valido (espera 200 + success true)
valid_resp="$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/api/quiz/result" \
  -H "Content-Type: application/json" \
  -d '{"state":"bloqueo"}')"
valid_body="$(echo "$valid_resp" | head -n1)"
valid_code="$(echo "$valid_resp" | tail -n1)"
[[ "$valid_code" == "200" ]] || fail "/api/quiz/result valido debe dar 200, dio $valid_code"
echo "$valid_body" | jq -e '.success==true and .state=="bloqueo"' >/dev/null 2>&1 || fail "respuesta valida inesperada"
pass "/api/quiz/result procesa estado valido"

# 5) Quiz email invalido (espera 400 + EMAIL_INVALID)
mail_bad_resp="$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/api/quiz/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"no-valido","state":"bloqueo"}')"
mail_bad_body="$(echo "$mail_bad_resp" | head -n1)"
mail_bad_code="$(echo "$mail_bad_resp" | tail -n1)"
[[ "$mail_bad_code" == "400" ]] || fail "/api/quiz/email invalido debe dar 400, dio $mail_bad_code"
echo "$mail_bad_body" | jq -e '.error=="EMAIL_INVALID"' >/dev/null 2>&1 || fail "error esperado EMAIL_INVALID"
pass "/api/quiz/email valida email invalido"

# 6) Quiz email valido (espera 200 + success true)
mail_ok_resp="$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/api/quiz/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_TEST\",\"state\":\"bloqueo\"}")"
mail_ok_body="$(echo "$mail_ok_resp" | head -n1)"
mail_ok_code="$(echo "$mail_ok_resp" | tail -n1)"
[[ "$mail_ok_code" == "200" ]] || fail "/api/quiz/email valido debe dar 200, dio $mail_ok_code"
echo "$mail_ok_body" | jq -e '.success==true' >/dev/null 2>&1 || fail "respuesta de envio inesperada"
pass "/api/quiz/email procesa envio"

echo
echo "Todo OK a nivel API."
echo "Verificacion manual final: confirma recepcion del correo en $EMAIL_TEST (incluye carpeta Spam)."
