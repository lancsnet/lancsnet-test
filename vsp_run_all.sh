#!/usr/bin/env bash
# =============================================================================
# VSP Platform Test Runner v1.0
# Usage: ./vsp_run_all.sh [--notify] [--report] [--parallel]
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PLATFORM_DIR="${PLATFORM_DIR:-$HOME/vsp-platform-v4.9.0}"
DOWNLOADS_DIR="${DOWNLOADS_DIR:-$HOME/Downloads}"
GATEWAY_PORT="${GATEWAY_PORT:-8921}"
GATEWAY_BIN="$PLATFORM_DIR/bin/vsp-gateway"
ENV_FILE="$PLATFORM_DIR/.env"
LOG_DIR="/tmp/vsp_logs"
HISTORY_FILE="/tmp/vsp_test_history.log"
REPORT_FILE="/tmp/vsp_report_$(date +%Y%m%d_%H%M%S).json"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
NOTIFY_DESKTOP="${NOTIFY_DESKTOP:-false}"
PARALLEL="${PARALLEL:-false}"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
fail() { echo -e "${RED}✗${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET} $*"; }

for arg in "$@"; do
  case $arg in
    --notify)   NOTIFY_DESKTOP=true ;;
    --parallel) PARALLEL=true ;;
    --report)   OPEN_REPORT=true ;;
  esac
done

mkdir -p "$LOG_DIR"

kill_gateway() {
  sudo fuser -k "${GATEWAY_PORT}/tcp" 2>/dev/null || true
  sleep 1
}

start_gateway() {
  kill_gateway
  env $(grep -v '^#' "$ENV_FILE" | xargs) "$GATEWAY_BIN" \
    >> "$LOG_DIR/gateway.log" 2>&1 &
  GW_PID=$!
  for i in $(seq 1 15); do
    nc -z localhost "$GATEWAY_PORT" 2>/dev/null && return 0
    sleep 1
  done
  fail "Gateway failed to start within 15s (PID $GW_PID)"
  return 1
}

notify() {
  local title="$1" msg="$2" urgency="${3:-normal}"
  [[ "$NOTIFY_DESKTOP" == "true" ]] && \
    notify-send -u "$urgency" "$title" "$msg" 2>/dev/null || true
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"*${title}*\n${msg}\"}" > /dev/null
  fi
  logger -t vsp-test "$title: $msg"
}

declare -A RESULTS
declare -A DURATIONS

run_suite() {
  local name="$1" pyfile="$2"
  local logfile="$LOG_DIR/${name}.log"
  local start=$SECONDS

  log "Running ${BOLD}$name${RESET} ($pyfile)..."
  start_gateway

  python3 "$DOWNLOADS_DIR/$pyfile" > "$logfile" 2>&1
  local exit_code=$?
  local elapsed=$(( SECONDS - start ))
  local passed total

  if grep -q "TOTAL:" "$logfile" 2>/dev/null; then
    passed=$(grep "TOTAL:" "$logfile" | grep -oP '\d+(?=/)' | tail -1)
    total=$(grep  "TOTAL:" "$logfile" | grep -oP '(?<=/)\d+' | tail -1)
  else
    passed=$(grep "Passed" "$logfile" | tail -1 | grep -oP '\d+(?= \()')
    total=$(grep  "Total"  "$logfile" | grep -v "→\|✓\|✗" | tail -1 | grep -oP ':\s*\K\d+')
  fi

  passed="${passed:-0}"; total="${total:-0}"
  RESULTS[$name]="$passed/$total"
  DURATIONS[$name]="$elapsed"

  if [[ "$passed" -eq "$total" && "$total" -gt 0 ]]; then
    ok "${BOLD}$name${RESET}: ${GREEN}${passed}/${total}${RESET} (${elapsed}s)"
  else
    fail "${BOLD}$name${RESET}: ${RED}${passed}/${total}${RESET} (${elapsed}s)"
    notify "VSP TEST FAILED" "$name: $passed/$total" critical
  fi

  kill_gateway
}

declare -A SUITES=(
  [vsp_advanced_v2]="vsp_advanced_test_v2.py"
  [vsp_advanced_v3]="vsp_advanced_test_v3.py"
  [vsp_uc]="vsp_uc_test.py"
  [vsp_uc19_26]="vsp_uc19_26_test.py"
  [vsp_uc27_35]="vsp_uc27_35_test.py"
  [vsp_uc30_34]="vsp_uc30_34_test.py"
  [vsp_uc36_42]="vsp_uc36_42_test.py"
  [vsp_uc43_49]="vsp_uc43_49_test.py"
)

SUITE_ORDER=(
  vsp_advanced_v2 vsp_advanced_v3
  vsp_uc vsp_uc19_26 vsp_uc27_35 vsp_uc30_34 vsp_uc36_42 vsp_uc43_49
)

RUN_START=$SECONDS
echo -e "\n${BOLD}═══════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  VSP Platform Test Runner — $(date '+%Y-%m-%d %H:%M:%S')${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════${RESET}\n"

if [[ "$PARALLEL" == "true" ]]; then
  warn "Parallel mode: gateway conflicts possible"
  for name in "${SUITE_ORDER[@]}"; do
    run_suite "$name" "${SUITES[$name]}" &
  done
  wait
else
  for name in "${SUITE_ORDER[@]}"; do
    run_suite "$name" "${SUITES[$name]}"
  done
fi

TOTAL_PASSED=0; TOTAL_TESTS=0; FAILED_SUITES=()
for name in "${SUITE_ORDER[@]}"; do
  IFS='/' read -r p t <<< "${RESULTS[$name]:-0/0}"
  TOTAL_PASSED=$(( TOTAL_PASSED + p ))
  TOTAL_TESTS=$(( TOTAL_TESTS + t ))
  [[ "$p" -lt "$t" ]] && FAILED_SUITES+=("$name")
done

ELAPSED=$(( SECONDS - RUN_START ))
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo -e "\n${BOLD}═══════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  SUMMARY${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════${RESET}"
for name in "${SUITE_ORDER[@]}"; do
  r="${RESULTS[$name]:-0/0}"; d="${DURATIONS[$name]:-0}"
  IFS='/' read -r p t <<< "$r"
  if [[ "$p" -eq "$t" && "$t" -gt 0 ]]; then
    echo -e "  ${GREEN}✓${RESET} $name: $r (${d}s)"
  else
    echo -e "  ${RED}✗${RESET} $name: $r (${d}s)"
  fi
done
echo -e "${BOLD}───────────────────────────────────────────────${RESET}"

if [[ ${#FAILED_SUITES[@]} -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}ALL PASSED: ${TOTAL_PASSED}/${TOTAL_TESTS} in ${ELAPSED}s${RESET}"
  notify "VSP Tests PASSED ✓" "All ${TOTAL_TESTS} tests passed in ${ELAPSED}s"
else
  echo -e "  ${RED}${BOLD}FAILED: ${TOTAL_PASSED}/${TOTAL_TESTS} — ${FAILED_SUITES[*]}${RESET}"
  notify "VSP Tests FAILED ✗" "${TOTAL_PASSED}/${TOTAL_TESTS} — Failed: ${FAILED_SUITES[*]}" critical
fi
echo -e "${BOLD}═══════════════════════════════════════════════${RESET}\n"

PREV=$(grep -oP '\d+(?=/)' "$HISTORY_FILE" 2>/dev/null | tail -1 || echo 0)
if [[ -n "$PREV" && "$TOTAL_PASSED" -lt "$PREV" ]]; then
  warn "REGRESSION DETECTED: $TOTAL_PASSED vs baseline $PREV"
  notify "VSP REGRESSION" "Passed $TOTAL_PASSED vs baseline $PREV" critical
fi
echo "$TIMESTAMP: ${TOTAL_PASSED}/${TOTAL_TESTS} tests passed in ${ELAPSED}s" >> "$HISTORY_FILE"

{
  echo "{"
  echo "  \"timestamp\": \"$TIMESTAMP\","
  echo "  \"version\": \"vsp-platform-v4.9.0\","
  echo "  \"total_passed\": $TOTAL_PASSED,"
  echo "  \"total_tests\": $TOTAL_TESTS,"
  echo "  \"duration_s\": $ELAPSED,"
  echo "  \"failed_suites\": [$(printf '"%s",' "${FAILED_SUITES[@]}" 2>/dev/null | sed 's/,$//')],"
  echo "  \"suites\": {"
  for i in "${!SUITE_ORDER[@]}"; do
    name="${SUITE_ORDER[$i]}"
    IFS='/' read -r p t <<< "${RESULTS[$name]:-0/0}"
    d="${DURATIONS[$name]:-0}"
    comma=$( [[ $i -lt $(( ${#SUITE_ORDER[@]} - 1 )) ]] && echo "," || echo "" )
    echo "    \"$name\": {\"passed\": $p, \"total\": $t, \"duration_s\": $d}$comma"
  done
  echo "  }"
  echo "}"
} > "$REPORT_FILE"

log "JSON report → $REPORT_FILE"
log "History    → $HISTORY_FILE"
log "Logs       → $LOG_DIR/"
