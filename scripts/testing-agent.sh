#!/usr/bin/env bash
# =============================================================================
# Luciérnaga Testing Agent
# =============================================================================
# Monitoriza cambios, ejecuta tests relevantes, verifica salud del sistema,
# notifica errores por Telegram y se instala como git hook automático.
#
# CUÁNDO EJECUTA:
#   - Manual       : npm run agent:run / agent:watch / agent:ci ...
#   - En git commit: automático vía pre-commit hook (npm run agent:hooks install)
#   - En git push  : automático vía pre-push hook  (npm run agent:hooks install)
#   - Modo daemon  : npm run agent:monitor  (watch + health cada N segundos)
#
# NOTIFICACIONES TELEGRAM:
#   Requiere en .env:  TELEGRAM_BOT_TOKEN y ADMIN_TELEGRAM_ID
#   Envía alerta cuando: tests fallan, health degradado, CI falla
#
# Uso:
#   ./scripts/testing-agent.sh run           # Tests una vez
#   ./scripts/testing-agent.sh watch         # Watch modo — re-ejecuta al cambiar ficheros
#   ./scripts/testing-agent.sh health        # Health check del servidor
#   ./scripts/testing-agent.sh monitor       # watch + health periódico
#   ./scripts/testing-agent.sh ci            # type check + lint + tests + cobertura
#   ./scripts/testing-agent.sh audit         # Auditoría rápida de configuración
#   ./scripts/testing-agent.sh hooks install # Instalar git hooks automáticos
#   ./scripts/testing-agent.sh hooks remove  # Quitar git hooks
#   ./scripts/testing-agent.sh report        # Mostrar último reporte
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/.testing-agent"
LOG_FILE="${LOG_DIR}/agent.log"
REPORT_FILE="${LOG_DIR}/last-report.txt"
HEALTH_LOG="${LOG_DIR}/health.log"

BASE_URL="${BASE_URL:-http://localhost:3000}"
WATCH_DIRS="${ROOT_DIR}/src"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-30}"   # segundos entre health checks en monitor
MAX_LOG_LINES=2000

# Cargar .env para leer credenciales de Telegram (si existe)
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT_DIR}/.env" 2>/dev/null || true
  set +a
fi

# Telegram — usa las mismas variables que src/lib/alerts.ts
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
# ADMIN_TELEGRAM_ID es el chat_id del admin (igual que en la app)
TELEGRAM_CHAT_ID="${ADMIN_TELEGRAM_ID:-${TELEGRAM_CHAT_ID:-}}"

# ---------------------------------------------------------------------------
# Colores
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  local level="$1"
  local msg="$2"
  local line="[$(timestamp)] [$level] $msg"
  mkdir -p "$LOG_DIR"
  echo "$line" >> "$LOG_FILE"
  case "$level" in
    INFO)  echo -e "${CYAN}${line}${RESET}" ;;
    OK)    echo -e "${GREEN}${line}${RESET}" ;;
    WARN)  echo -e "${YELLOW}${line}${RESET}" ;;
    ERROR) echo -e "${RED}${line}${RESET}" ;;
    STEP)  echo -e "${BOLD}${BLUE}${line}${RESET}" ;;
    DIM)   echo -e "${DIM}${line}${RESET}" ;;
    *)     echo "$line" ;;
  esac
}

separator() {
  echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

header() {
  separator
  echo -e "${BOLD}${BLUE}  $1${RESET}"
  separator
}

# ---------------------------------------------------------------------------
# Notificaciones Telegram
# ---------------------------------------------------------------------------
# Reutiliza TELEGRAM_BOT_TOKEN y ADMIN_TELEGRAM_ID — las mismas vars que
# usa src/lib/alerts.ts en la app para las alertas de crisis/retención.
# ---------------------------------------------------------------------------

send_telegram() {
  local emoji="$1"
  local title="$2"
  local body="$3"

  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    log "DIM" "Telegram no configurado (TELEGRAM_BOT_TOKEN / ADMIN_TELEGRAM_ID ausentes)"
    return 0
  fi

  local text="${emoji} *[Testing Agent] ${title}*

${body}

🕐 $(timestamp)
🖥️  Host: $(hostname)"

  # Escapa caracteres especiales de Markdown de Telegram
  local safe_text
  safe_text=$(echo "$text" | sed 's/_/\\_/g; s/\[/\\[/g')

  local http_status
  http_status=$(curl -sS --max-time 10 -o /dev/null -w "%{http_code}" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${safe_text}" \
    -d "parse_mode=Markdown" 2>/dev/null) || true

  if [[ "$http_status" == "200" ]]; then
    log "OK" "Telegram → notificación enviada"
  else
    log "WARN" "Telegram → falló (HTTP $http_status)"
  fi
}

notify_failure() {
  local context="$1"   # "tests", "ci", "health", "audit"
  local details="$2"   # resumen del error

  send_telegram "🚨" "Fallo en $context" "$details"
}

notify_success() {
  local context="$1"
  local details="${2:-}"

  send_telegram "✅" "$context OK" "${details:-Sin detalles adicionales}"
}

# ---------------------------------------------------------------------------
# Mapeo fichero → tests relevantes
# ---------------------------------------------------------------------------
get_related_tests() {
  local file="$1"
  local tests=()

  # Servicios
  [[ "$file" =~ src/services/ai\.ts ]]                && tests+=("src/services/ai.test.ts")
  [[ "$file" =~ src/services/coach\.ts ]]              && tests+=("src/services/coach.test.ts")
  [[ "$file" =~ src/services/emotional-model\.ts ]]    && tests+=("src/services/emotional-model.test.ts")
  [[ "$file" =~ src/services/goals\.ts ]]              && tests+=("src/services/goals.test.ts")
  [[ "$file" =~ src/services/impulse-diagnostic\.ts ]] && tests+=("src/services/impulse-diagnostic.test.ts")
  [[ "$file" =~ src/services/mentor-protocol\.ts ]]    && tests+=("src/services/mentor-protocol.test.ts")
  [[ "$file" =~ src/services/onboarding\.ts ]]         && tests+=("src/services/onboarding.test.ts")
  [[ "$file" =~ src/services/risk\.ts ]]               && tests+=("src/services/risk.test.ts")
  [[ "$file" =~ src/services/search\.ts ]]             && tests+=("src/services/search.test.ts")
  [[ "$file" =~ src/services/transformation\.ts ]]     && tests+=("src/services/transformation.test.ts")

  # Auth — si cambia auth.ts, re-ejecutar todos los tests de auth
  if [[ "$file" =~ src/lib/auth\.ts ]]; then
    tests+=(
      "src/app/api/auth/bootstrap/route.test.ts"
      "src/app/api/auth/login/route.test.ts"
      "src/app/api/auth/token/route.test.ts"
      "src/app/api/auth/capture-email/route.test.ts"
    )
  fi

  # Estado de usuario
  [[ "$file" =~ src/lib/user-state\.ts ]] && tests+=("src/lib/user-state.test.ts")

  # Routes de API
  [[ "$file" =~ src/app/api/chat/route\.ts ]]          && tests+=("src/app/api/chat/route.test.ts")
  [[ "$file" =~ src/app/api/conversations/route\.ts ]]  && tests+=("src/app/api/conversations/route.test.ts")
  [[ "$file" =~ src/app/api/mock-chat/route\.ts ]]      && tests+=("src/app/api/mock-chat/route.test.ts")
  [[ "$file" =~ src/app/api/checkin/route\.ts ]]        && tests+=("src/app/api/checkin/route.test.ts")
  [[ "$file" =~ src/app/api/health/route\.ts ]]         && tests+=("src/app/api/health/route.test.ts")
  [[ "$file" =~ src/app/api/legal/route\.ts ]]          && tests+=("src/app/api/legal/route.test.ts")
  [[ "$file" =~ src/app/api/ready/route\.ts ]]          && tests+=("src/app/api/ready/route.test.ts")

  # Si el fichero cambiado es un test, ejecutarlo directamente
  [[ "$file" =~ \.test\.ts$ ]] && tests+=("$file")

  printf '%s\n' "${tests[@]}"
}

# ---------------------------------------------------------------------------
# Ejecutar tests
# ---------------------------------------------------------------------------
run_tests() {
  local test_pattern="${1:-}"
  local start_time end_time elapsed exit_code

  start_time=$(date +%s)

  if [[ -z "$test_pattern" ]]; then
    log "STEP" "Ejecutando suite completa de tests..."
    set +e
    cd "$ROOT_DIR" && npx jest --runInBand --colors 2>&1 | tee -a "$LOG_FILE"
    exit_code="${PIPESTATUS[0]}"
    set -e
  else
    log "STEP" "Ejecutando: $test_pattern"
    set +e
    cd "$ROOT_DIR" && npx jest --runInBand --colors "$test_pattern" 2>&1 | tee -a "$LOG_FILE"
    exit_code="${PIPESTATUS[0]}"
    set -e
  fi

  end_time=$(date +%s)
  elapsed=$((end_time - start_time))

  if [[ "$exit_code" -eq 0 ]]; then
    log "OK" "Tests pasaron en ${elapsed}s"
  else
    log "ERROR" "Tests fallaron en ${elapsed}s"
    # Notificar por Telegram con resumen del fallo
    local context_label="${test_pattern:-suite completa}"
    notify_failure "tests" "Fallaron los tests: ${context_label}
⏱ Duración: ${elapsed}s
📂 Proyecto: $(basename "$ROOT_DIR")"
  fi

  return "$exit_code"
}

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
check_health() {
  local url="${BASE_URL}/api/health"
  local ready_url="${BASE_URL}/api/ready"
  local result=0

  log "STEP" "Health check → $BASE_URL"

  # /api/health
  set +e
  local health_response
  health_response=$(curl -sS --max-time 10 -w "\n%{http_code}" "$url" 2>/dev/null)
  local curl_exit=$?
  set -e

  if [[ "$curl_exit" -ne 0 ]]; then
    log "WARN" "  /api/health — No responde (app no corriendo en $BASE_URL)"
    return 1
  fi

  local health_status health_body
  health_status=$(echo "$health_response" | tail -n1)
  health_body=$(echo "$health_response" | sed '$d')

  if [[ "$health_status" -lt 400 ]]; then
    log "OK" "  /api/health → $health_status — $health_body"
  else
    log "ERROR" "  /api/health → $health_status — $health_body"
    notify_failure "health" "/api/health devolvió HTTP $health_status
📍 URL: $BASE_URL
📋 Body: $health_body"
    result=1
  fi

  # /api/ready
  set +e
  local ready_response
  ready_response=$(curl -sS --max-time 10 -w "\n%{http_code}" "$ready_url" 2>/dev/null)
  local ready_curl_exit=$?
  set -e

  if [[ "$ready_curl_exit" -eq 0 ]]; then
    local ready_status ready_body
    ready_status=$(echo "$ready_response" | tail -n1)
    ready_body=$(echo "$ready_response" | sed '$d')

    if [[ "$ready_status" -lt 400 ]]; then
      log "OK" "  /api/ready  → $ready_status — $ready_body"
    else
      log "WARN" "  /api/ready  → $ready_status — $ready_body"
    fi
  fi

  # OpenRouter
  if echo "$health_body" | grep -q '"openrouter":true'; then
    log "OK" "  OpenRouter key → presente"
  else
    log "WARN" "  OpenRouter key → no detectada"
    result=1
  fi

  echo "[$(timestamp)] status=$health_status openrouter=$(echo "$health_body" | grep -o '"openrouter":[a-z]*' || echo 'unknown')" >> "$HEALTH_LOG"
  return "$result"
}

# ---------------------------------------------------------------------------
# Reporte
# ---------------------------------------------------------------------------
generate_report() {
  local test_result="${1:-unknown}"
  local health_result="${2:-unknown}"
  mkdir -p "$LOG_DIR"
  {
    echo "======================================================================"
    echo "  Luciérnaga Testing Agent — Reporte"
    echo "  Generado: $(timestamp)"
    echo "======================================================================"
    echo "TESTS:  $test_result"
    echo "SALUD:  $health_result"
    echo ""
    echo "Últimas 20 entradas del log:"
    echo "----------------------------------------------------------------------"
    [[ -f "$LOG_FILE" ]] && tail -20 "$LOG_FILE"
    echo ""
    echo "Últimos 10 health checks:"
    echo "----------------------------------------------------------------------"
    [[ -f "$HEALTH_LOG" ]] && tail -10 "$HEALTH_LOG"
    echo "======================================================================"
  } > "$REPORT_FILE"
  log "INFO" "Reporte guardado en $REPORT_FILE"
}

# ---------------------------------------------------------------------------
# Modo: run
# ---------------------------------------------------------------------------
cmd_run() {
  header "Testing Agent — Modo: RUN"
  log "INFO" "Directorio: $ROOT_DIR"

  local test_result="PASS"
  if ! run_tests; then
    test_result="FAIL"
  fi

  local health_result="N/A"
  if check_health 2>/dev/null; then
    health_result="OK"
  else
    health_result="WARN"
  fi

  generate_report "$test_result" "$health_result"
  separator

  if [[ "$test_result" == "PASS" ]]; then
    echo -e "${GREEN}${BOLD}  ✓ Todos los tests pasaron${RESET}"
  else
    echo -e "${RED}${BOLD}  ✗ Tests fallaron — ver log en $LOG_FILE${RESET}"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Modo: health
# ---------------------------------------------------------------------------
cmd_health() {
  header "Testing Agent — Modo: HEALTH"
  if check_health; then
    echo -e "${GREEN}${BOLD}  ✓ Sistema saludable${RESET}"
  else
    echo -e "${RED}${BOLD}  ✗ Problemas detectados${RESET}"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Modo: watch
# ---------------------------------------------------------------------------
cmd_watch() {
  header "Testing Agent — Modo: WATCH"
  log "INFO" "Vigilando cambios en: $WATCH_DIRS"
  log "INFO" "Presiona Ctrl+C para detener"
  separator

  if command -v fswatch &>/dev/null; then
    log "INFO" "Motor: fswatch (macOS)"
    _watch_with_fswatch
  elif command -v inotifywait &>/dev/null; then
    log "INFO" "Motor: inotifywait (Linux)"
    _watch_with_inotifywait
  else
    log "WARN" "fswatch/inotifywait no disponibles → polling cada 3s"
    _watch_with_polling
  fi
}

_watch_with_fswatch() {
  local last_file="" last_time=0

  fswatch -r \
    -e ".*\.d\.ts$" -e ".*node_modules.*" -e ".*\.next.*" -e ".*\.testing-agent.*" \
    --event Created --event Updated --event Renamed \
    "$WATCH_DIRS" | while IFS= read -r changed_file; do

    local now
    now=$(date +%s)
    if [[ "$changed_file" == "$last_file" && $((now - last_time)) -lt 2 ]]; then
      continue
    fi
    last_file="$changed_file"
    last_time="$now"

    local rel_file="${changed_file#"$ROOT_DIR/"}"
    log "INFO" "Cambio: $rel_file"

    local related_tests=()
    while IFS= read -r t; do
      [[ -n "$t" ]] && related_tests+=("$t")
    done < <(get_related_tests "$rel_file")

    set +e
    if [[ "${#related_tests[@]}" -gt 0 ]]; then
      log "STEP" "Tests relacionados: ${related_tests[*]}"
      local pattern
      pattern=$(printf '%s|' "${related_tests[@]}")
      run_tests "${pattern%|}"
    else
      log "DIM" "Sin tests directos → suite completa"
      run_tests
    fi
    set -e
    separator
  done
}

_watch_with_inotifywait() {
  while true; do
    local changed_file
    changed_file=$(inotifywait -r -e modify,create,move \
      --exclude "(\.d\.ts$|node_modules|\.next|\.testing-agent)" \
      --format '%w%f' -q "$WATCH_DIRS" 2>/dev/null) || continue
    log "INFO" "Cambio: ${changed_file#"$ROOT_DIR/"}"
    set +e; run_tests; set -e
    separator
  done
}

_watch_with_polling() {
  local prev_hash=""
  while true; do
    local curr_hash
    curr_hash=$(find "$WATCH_DIRS" \
      -not -path "*/node_modules/*" -not -path "*/.next/*" \
      \( -name "*.ts" -o -name "*.tsx" \) \
      | sort | xargs stat -f "%m %N" 2>/dev/null | md5 2>/dev/null || echo "")
    if [[ "$curr_hash" != "$prev_hash" && -n "$prev_hash" ]]; then
      log "INFO" "Cambio detectado (polling)"
      set +e; run_tests; set -e
      separator
    fi
    prev_hash="$curr_hash"
    sleep 3
  done
}

# ---------------------------------------------------------------------------
# Modo: monitor — watch + health periódico
# ---------------------------------------------------------------------------
cmd_monitor() {
  header "Testing Agent — Modo: MONITOR (daemon)"
  log "INFO" "Watch de ficheros + health check cada ${HEALTH_INTERVAL}s"
  log "INFO" "Telegram: $( [[ -n "$TELEGRAM_CHAT_ID" ]] && echo "activo → chat $TELEGRAM_CHAT_ID" || echo "no configurado" )"
  log "INFO" "Presiona Ctrl+C para detener"
  separator

  # Health loop en background
  _health_loop() {
    while true; do
      sleep "$HEALTH_INTERVAL"
      log "STEP" "Health check periódico"
      check_health || true
      separator
    done
  }
  _health_loop &
  local health_pid=$!
  trap "kill $health_pid 2>/dev/null; log INFO 'Monitor detenido.'" EXIT INT TERM

  cmd_watch
}

# ---------------------------------------------------------------------------
# Modo: ci — type check + lint + tests + cobertura
# ---------------------------------------------------------------------------
cmd_ci() {
  header "Testing Agent — Modo: CI"
  log "INFO" "Pipeline completo"
  local overall=0 tsc_exit=0 lint_exit=0 test_exit=0

  # 1. Type check
  log "STEP" "1/3 tsc --noEmit"
  set +e
  cd "$ROOT_DIR" && npx tsc --noEmit 2>&1 | tee -a "$LOG_FILE"
  tsc_exit="${PIPESTATUS[0]}"
  set -e
  [[ "$tsc_exit" -eq 0 ]] && log "OK" "Type check → PASS" || { log "ERROR" "Type check → FAIL"; overall=1; }
  separator

  # 2. Lint
  log "STEP" "2/3 ESLint"
  set +e
  cd "$ROOT_DIR" && npm run lint 2>&1 | tee -a "$LOG_FILE"
  lint_exit="${PIPESTATUS[0]}"
  set -e
  [[ "$lint_exit" -eq 0 ]] && log "OK" "Lint → PASS" || { log "ERROR" "Lint → FAIL"; overall=1; }
  separator

  # 3. Tests + cobertura
  log "STEP" "3/3 Tests con cobertura"
  set +e
  cd "$ROOT_DIR" && npx jest --runInBand --colors --coverage 2>&1 | tee -a "$LOG_FILE"
  test_exit="${PIPESTATUS[0]}"
  set -e
  [[ "$test_exit" -eq 0 ]] && log "OK" "Tests → PASS" || { log "ERROR" "Tests → FAIL"; overall=1; }
  separator

  # Resumen
  local tsc_lbl lint_lbl test_lbl
  [[ "$tsc_exit"  -eq 0 ]] && tsc_lbl="${GREEN}PASS${RESET}"  || tsc_lbl="${RED}FAIL${RESET}"
  [[ "$lint_exit" -eq 0 ]] && lint_lbl="${GREEN}PASS${RESET}" || lint_lbl="${RED}FAIL${RESET}"
  [[ "$test_exit" -eq 0 ]] && test_lbl="${GREEN}PASS${RESET}" || test_lbl="${RED}FAIL${RESET}"

  echo ""
  echo -e "${BOLD}  Resumen CI${RESET}"
  echo -e "  Type check : $(echo -e "$tsc_lbl")"
  echo -e "  Lint       : $(echo -e "$lint_lbl")"
  echo -e "  Tests      : $(echo -e "$test_lbl")"
  echo ""

  if [[ "$overall" -ne 0 ]]; then
    # Notificar fallo por Telegram
    local failures=()
    [[ "$tsc_exit"  -ne 0 ]] && failures+=("TypeScript (tsc)")
    [[ "$lint_exit" -ne 0 ]] && failures+=("ESLint")
    [[ "$test_exit" -ne 0 ]] && failures+=("Tests/Cobertura")
    notify_failure "CI pipeline" "Etapas fallidas: $(IFS=', '; echo "${failures[*]}")
📂 Proyecto: $(basename "$ROOT_DIR")
🔀 Branch: $(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
    echo -e "${RED}${BOLD}  ✗ CI falló${RESET}"
    exit 1
  else
    echo -e "${GREEN}${BOLD}  ✓ CI completo — todo OK${RESET}"
    notify_success "CI pipeline" "type check + lint + tests pasaron correctamente"
  fi
}

# ---------------------------------------------------------------------------
# Modo: audit — auditoría rápida del sistema
# ---------------------------------------------------------------------------
cmd_audit() {
  header "Testing Agent — Auditoría rápida"
  local issues=0

  # 1. Variables de entorno críticas
  log "STEP" "1. Variables de entorno críticas"
  for var in DATABASE_URL AUTH_TOKEN_SECRET OPENROUTER_API_KEY; do
    if [[ -n "${!var:-}" ]]; then
      log "OK" "  $var → presente"
    else
      log "WARN" "  $var → AUSENTE"
      ((issues++))
    fi
  done
  separator

  # 2. Presencia de tests para servicios clave
  # Nota: auth.ts se testea indirectamente via los 4 route tests de auth/.
  # Formato: "src:test" separado por ":"
  log "STEP" "2. Cobertura de tests (presencia de ficheros)"
  local coverage_pairs=(
    "src/services/ai.ts:src/services/ai.test.ts"
    "src/services/risk.ts:src/services/risk.test.ts"
    "src/services/goals.ts:src/services/goals.test.ts"
    "src/lib/auth.ts:src/app/api/auth/bootstrap/route.test.ts"
    "src/app/api/chat/route.ts:src/app/api/chat/route.test.ts"
  )
  for pair in "${coverage_pairs[@]}"; do
    local svc="${pair%%:*}"
    local test_file="${pair##*:}"
    if [[ -f "$ROOT_DIR/$test_file" ]]; then
      log "OK" "  $svc → test presente"
    else
      log "WARN" "  $svc → SIN test"
      ((issues++))
    fi
  done
  separator

  # 3. Security headers
  log "STEP" "3. Security headers en next.config.ts"
  if grep -q "X-Frame-Options\|Content-Security-Policy\|X-Content-Type-Options" \
       "${ROOT_DIR}/next.config.ts" 2>/dev/null; then
    log "OK" "  Security headers → presentes"
  else
    log "WARN" "  Security headers → AUSENTES (ver AUDIT.md S-01)"
    ((issues++))
  fi
  separator

  # 4. console.log en servicios
  log "STEP" "4. console.log en servicios/lib"
  local console_logs
  console_logs=$(grep -r "console\.log" \
    "${ROOT_DIR}/src/services/" "${ROOT_DIR}/src/lib/" \
    --include="*.ts" -l 2>/dev/null | grep -v "\.test\.ts$" || true)
  if [[ -z "$console_logs" ]]; then
    log "OK" "  Sin console.log en servicios/lib"
  else
    log "WARN" "  console.log en: $console_logs"
    ((issues++))
  fi
  separator

  # 5. MVP_STATIC_IDENTITY
  log "STEP" "5. MVP_STATIC_IDENTITY"
  if grep -q "^MVP_STATIC_IDENTITY=true" "${ROOT_DIR}/.env" 2>/dev/null || \
     grep -q "^MVP_STATIC_IDENTITY=true" "${ROOT_DIR}/.env.production" 2>/dev/null; then
    log "ERROR" "  MVP_STATIC_IDENTITY=true activo (ver AUDIT.md S-03)"
    ((issues++))
  else
    log "OK" "  MVP_STATIC_IDENTITY → no activo"
  fi
  separator

  # 6. Telegram configurado
  log "STEP" "6. Notificaciones Telegram"
  if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
    log "OK" "  Telegram → configurado (chat_id: $TELEGRAM_CHAT_ID)"
  else
    log "WARN" "  Telegram → no configurado (TELEGRAM_BOT_TOKEN / ADMIN_TELEGRAM_ID ausentes)"
    ((issues++))
  fi
  separator

  # Resumen + notificación si hay problemas
  if [[ "$issues" -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}  ✓ Auditoría rápida — sin problemas${RESET}"
    notify_success "Auditoría rápida" "Todas las verificaciones pasaron correctamente"
  else
    echo -e "${YELLOW}${BOLD}  ⚠ Auditoría rápida — $issues problema(s)${RESET}"
    echo -e "${DIM}  Ver AUDIT.md para análisis completo${RESET}"
    notify_failure "Auditoría rápida" "$issues problema(s) detectado(s).
Revisa AUDIT.md para el detalle completo."
  fi
}

# ---------------------------------------------------------------------------
# Modo: hooks — instalar/quitar git hooks
# ---------------------------------------------------------------------------
cmd_hooks() {
  local action="${1:-install}"
  local hooks_dir="${ROOT_DIR}/.git/hooks"

  if [[ ! -d "$hooks_dir" ]]; then
    log "ERROR" "No se encontró .git/hooks en $ROOT_DIR — ¿es un repositorio git?"
    exit 1
  fi

  case "$action" in
    install)
      header "Testing Agent — Instalando git hooks"

      # pre-commit: ejecuta tests relacionados con los ficheros staged
      cat > "${hooks_dir}/pre-commit" << 'HOOK'
#!/usr/bin/env bash
# Testing Agent — pre-commit hook
# Ejecuta tests para los ficheros que se van a commitear

AGENT="$(git rev-parse --show-toplevel)/scripts/testing-agent.sh"
if [[ ! -f "$AGENT" ]]; then exit 0; fi

# Obtener ficheros staged
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.tsx?$" | head -20 || true)
if [[ -z "$STAGED" ]]; then exit 0; fi

echo ""
echo "🔍 Testing Agent — pre-commit check"
echo "Ficheros staged:"
echo "$STAGED" | sed 's/^/  /'
echo ""

# Recolectar tests relacionados
TESTS=""
while IFS= read -r file; do
  related=$(bash "$AGENT" _get_tests_for "$file" 2>/dev/null || true)
  if [[ -n "$related" ]]; then
    TESTS="${TESTS}${related}\n"
  fi
done <<< "$STAGED"

if [[ -z "$TESTS" ]]; then
  echo "Sin tests directamente relacionados — OK"
  exit 0
fi

# Deduplicate
UNIQUE_TESTS=$(echo -e "$TESTS" | sort -u | tr '\n' '|' | sed 's/|$//')

echo "Tests a ejecutar: $UNIQUE_TESTS"
echo ""

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
if npx jest --runInBand --colors "$UNIQUE_TESTS" 2>&1; then
  echo ""
  echo "✓ Tests pre-commit pasaron"
  exit 0
else
  echo ""
  echo "✗ Tests fallaron — commit bloqueado"
  echo "  Para saltarte el hook en casos urgentes: git commit --no-verify"
  exit 1
fi
HOOK
      chmod +x "${hooks_dir}/pre-commit"
      log "OK" "pre-commit hook instalado → ejecuta tests de los ficheros staged"

      # pre-push: ejecuta suite completa antes de push
      cat > "${hooks_dir}/pre-push" << 'HOOK'
#!/usr/bin/env bash
# Testing Agent — pre-push hook
# Ejecuta la suite completa antes de subir código

AGENT="$(git rev-parse --show-toplevel)/scripts/testing-agent.sh"
if [[ ! -f "$AGENT" ]]; then exit 0; fi

echo ""
echo "🚀 Testing Agent — pre-push check (suite completa)"
echo ""

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

if npx jest --runInBand --colors 2>&1; then
  echo ""
  echo "✓ Suite completa pasó — push autorizado"
  # Notificar éxito por Telegram si está configurado
  bash "$AGENT" _notify_push_ok 2>/dev/null || true
  exit 0
else
  echo ""
  echo "✗ Tests fallaron — push bloqueado"
  echo "  Para saltarte: git push --no-verify"
  # Notificar fallo por Telegram
  bash "$AGENT" _notify_push_fail 2>/dev/null || true
  exit 1
fi
HOOK
      chmod +x "${hooks_dir}/pre-push"
      log "OK" "pre-push hook instalado → ejecuta suite completa antes de cada push"

      separator
      echo -e "${GREEN}${BOLD}  ✓ Git hooks instalados${RESET}"
      echo ""
      echo "  Funcionamiento:"
      echo -e "  ${CYAN}git commit${RESET}  → ejecuta tests de los ficheros staged (rápido)"
      echo -e "  ${CYAN}git push${RESET}    → ejecuta suite completa (completo)"
      echo ""
      echo -e "  Para desactivar: ${DIM}./scripts/testing-agent.sh hooks remove${RESET}"
      ;;

    remove)
      header "Testing Agent — Eliminando git hooks"
      for hook in pre-commit pre-push; do
        local hook_path="${hooks_dir}/${hook}"
        if [[ -f "$hook_path" ]] && grep -q "Testing Agent" "$hook_path" 2>/dev/null; then
          rm "$hook_path"
          log "OK" "$hook hook eliminado"
        else
          log "DIM" "$hook — no era del Testing Agent (no eliminado)"
        fi
      done
      echo -e "${GREEN}  ✓ Git hooks eliminados${RESET}"
      ;;

    *)
      echo "Uso: ./scripts/testing-agent.sh hooks [install|remove]"
      exit 1
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Funciones internas usadas por los hooks
# ---------------------------------------------------------------------------
_get_tests_for() {
  # Usado por el pre-commit hook para obtener tests de un fichero
  get_related_tests "$1"
}

_notify_push_ok() {
  notify_success "pre-push" "Suite completa pasó — código subido correctamente
🔀 Branch: $(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}

_notify_push_fail() {
  notify_failure "pre-push" "Tests fallaron — push bloqueado
🔀 Branch: $(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}

# ---------------------------------------------------------------------------
# Mantenimiento del log
# ---------------------------------------------------------------------------
rotate_log() {
  mkdir -p "$LOG_DIR"
  if [[ -f "$LOG_FILE" ]]; then
    local lines
    lines=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
    if [[ "$lines" -gt "$MAX_LOG_LINES" ]]; then
      mv "$LOG_FILE" "${LOG_FILE}.prev"
      log "INFO" "Log rotado (anterior en ${LOG_FILE}.prev)"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Modo: report
# ---------------------------------------------------------------------------
cmd_report() {
  if [[ -f "$REPORT_FILE" ]]; then
    cat "$REPORT_FILE"
  else
    echo "No hay reporte guardado. Ejecuta: npm run agent:run"
  fi
}

# ---------------------------------------------------------------------------
# Ayuda
# ---------------------------------------------------------------------------
cmd_help() {
  echo ""
  echo -e "${BOLD}  Luciérnaga Testing Agent${RESET}"
  echo ""
  echo "  Uso: ./scripts/testing-agent.sh <comando>"
  echo ""
  echo "  Comandos:"
  echo -e "    ${CYAN}run${RESET}            — Ejecutar todos los tests una vez"
  echo -e "    ${CYAN}watch${RESET}          — Vigilar cambios y re-ejecutar tests automáticamente"
  echo -e "    ${CYAN}health${RESET}         — Verificar salud de la app (requiere app corriendo)"
  echo -e "    ${CYAN}monitor${RESET}        — watch + health periódico (daemon)"
  echo -e "    ${CYAN}ci${RESET}             — type check + lint + tests + cobertura"
  echo -e "    ${CYAN}audit${RESET}          — Auditoría rápida de config y seguridad"
  echo -e "    ${CYAN}hooks install${RESET}  — Instalar pre-commit y pre-push hooks"
  echo -e "    ${CYAN}hooks remove${RESET}   — Quitar git hooks"
  echo -e "    ${CYAN}report${RESET}         — Mostrar último reporte guardado"
  echo ""
  echo "  Cuándo ejecuta automáticamente:"
  echo -e "    ${DIM}git commit${RESET}  → tests de ficheros staged (tras hooks install)"
  echo -e "    ${DIM}git push${RESET}    → suite completa (tras hooks install)"
  echo -e "    ${DIM}al guardar${RESET}  → tests relevantes (modo watch/monitor activo)"
  echo ""
  echo "  Notificaciones Telegram:"
  echo "    Requiere en .env: TELEGRAM_BOT_TOKEN y ADMIN_TELEGRAM_ID"
  echo "    Notifica al fallar: tests, CI, health checks, auditoría"
  echo ""
  echo "  Variables de entorno:"
  echo "    BASE_URL         URL de la app  (default: http://localhost:3000)"
  echo "    HEALTH_INTERVAL  Segundos entre health checks en monitor (default: 30)"
  echo ""
  echo -e "  Logs: ${DIM}${LOG_DIR}/${RESET}"
  echo ""
}

# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------
mkdir -p "$LOG_DIR"
rotate_log

COMMAND="${1:-help}"

case "$COMMAND" in
  run)              cmd_run ;;
  health)           cmd_health ;;
  watch)            cmd_watch ;;
  monitor)          cmd_monitor ;;
  ci)               cmd_ci ;;
  audit)            cmd_audit ;;
  hooks)            cmd_hooks "${2:-install}" ;;
  report)           cmd_report ;;
  _get_tests_for)   _get_tests_for "${2:-}" ;;
  _notify_push_ok)  _notify_push_ok ;;
  _notify_push_fail) _notify_push_fail ;;
  help|--help|-h)   cmd_help ;;
  *)
    echo -e "${RED}Comando desconocido: $COMMAND${RESET}"
    echo "Usa: ./scripts/testing-agent.sh help"
    exit 1
    ;;
esac
